import { AllocationRepository } from "@/modules/allocation/repositories/allocation.repository";
import { MaintenancePolicy } from "@/modules/maintenance/policies/maintenance.policy";
import { MaintenanceRequestRepository } from "@/modules/maintenance/repositories/maintenance-request.repository";
import type { RaiseMaintenanceInput } from "@/modules/maintenance/validators/maintenance.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { AuthorizationError, ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class RaiseMaintenanceRequestService {
  async execute(user: SessionUser, input: RaiseMaintenanceInput) {
    MaintenancePolicy.assertCanRaise(user);

    const heldAsset = await new AllocationRepository().findActiveByHolderAndAsset(
      user.id,
      input.assetId
    );

    if (!heldAsset) {
      throw new AuthorizationError("AUTH_007");
    }

    try {
      return await withTransaction(async (tx) => {
        const maintenanceRepo = new MaintenanceRequestRepository(tx);

        const request = await maintenanceRepo.create({
          asset: { connect: { id: input.assetId } },
          raisedBy: { connect: { id: user.id } },
          description: input.description,
          priority: input.priority,
          status: "PENDING",
        });

        await logActivity(tx, {
          actorId: user.id,
          action: "MAINTENANCE_REQUESTED",
          entityType: "MaintenanceRequest",
          entityId: request.id,
          newValue: { status: "PENDING", assetId: input.assetId },
        });

        return request;
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("one_active_maintenance_per_asset") ||
          error.message.includes("P2002"))
      ) {
        throw new ConflictError("MAINT_002");
      }
      throw error;
    }
  }
}

export const raiseMaintenanceRequestService = new RaiseMaintenanceRequestService();
