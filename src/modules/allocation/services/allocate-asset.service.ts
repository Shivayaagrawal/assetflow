import { AssetPolicy } from "@/modules/asset/policies/asset.policy";
import { AssetStateMachine } from "@/modules/asset/domain/asset-state-machine";
import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import { AllocationPolicy } from "@/modules/allocation/policies/allocation.policy";
import { AllocationRepository } from "@/modules/allocation/repositories/allocation.repository";
import type { AllocateAssetInput } from "@/modules/allocation/validators/allocation.schema";
import { createNotification } from "@/modules/notification/services/create-notification.service";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import {
  ConflictError,
  NotFoundError,
} from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class AllocateAssetService {
  constructor(
    private readonly allocations = new AllocationRepository(),
    private readonly assets = new AssetRepository()
  ) {}

  async execute(user: SessionUser, input: AllocateAssetInput) {
    AllocationPolicy.assertCanAllocate(user);

    const asset = await this.assets.findById(input.assetId);
    if (!asset) throw new NotFoundError("ASSET_001");

    const active = await this.allocations.findActiveByAsset(input.assetId);
    if (active) {
      throw new ConflictError("ASSET_004");
    }

    AssetPolicy.assertCanAllocate(user, asset);

    return withTransaction(async (tx) => {
      const allocRepo = new AllocationRepository(tx);
      const assetRepo = new AssetRepository(tx);

      AssetStateMachine.assertTransition(asset.status, "ALLOCATED");

      const allocation = await allocRepo.create({
        asset: { connect: { id: asset.id } },
        holderType: "EMPLOYEE",
        holderEmployee: { connect: { id: input.employeeId } },
        expectedReturnDate: input.expectedReturnDate,
        status: "ACTIVE",
      });

      await assetRepo.updateStatus(asset.id, "ALLOCATED");

      await createNotification(tx, {
        recipientId: input.employeeId,
        type: "ASSET_ASSIGNED",
        message: `${asset.assetTag} allocated to you`,
        relatedEntityType: "Allocation",
        relatedEntityId: allocation.id,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "ASSET_ALLOCATED",
        entityType: "Asset",
        entityId: asset.id,
        newValue: { allocationId: allocation.id, employeeId: input.employeeId },
      });

      return allocation;
    });
  }
}

export const allocateAssetService = new AllocateAssetService();
