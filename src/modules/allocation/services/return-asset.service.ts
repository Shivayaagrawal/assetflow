import { AllocationPolicy } from "@/modules/allocation/policies/allocation.policy";
import { AllocationRepository } from "@/modules/allocation/repositories/allocation.repository";
import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import type { ReturnAssetInput } from "@/modules/allocation/validators/allocation.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import {
  ConflictError,
  NotFoundError,
} from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class ReturnAssetService {
  constructor(
    private readonly allocations = new AllocationRepository(),
    private readonly assets = new AssetRepository()
  ) {}

  async execute(user: SessionUser, input: ReturnAssetInput) {
    AllocationPolicy.assertCanReturn(user);

    const allocation = await this.allocations.findById(input.allocationId);
    if (!allocation) throw new NotFoundError("ALLOC_001");

    if (allocation.status === "RETURNED") {
      throw new ConflictError("ALLOC_003");
    }

    return withTransaction(async (tx) => {
      const allocRepo = new AllocationRepository(tx);
      const assetRepo = new AssetRepository(tx);

      const closed = await allocRepo.close(
        allocation.id,
        new Date(),
        input.conditionCheckinNotes
      );

      await assetRepo.updateStatus(allocation.assetId, "AVAILABLE");

      await logActivity(tx, {
        actorId: user.id,
        actionType: "ASSET_RETURNED",
        targetEntityType: "Asset",
        targetEntityId: allocation.assetId,
        description: `${allocation.asset?.assetTag ?? allocation.assetId} returned`,
        oldValue: { status: "ALLOCATED" },
        newValue: { status: "AVAILABLE" },
      });

      return closed;
    });
  }
}

export const returnAssetService = new ReturnAssetService();
