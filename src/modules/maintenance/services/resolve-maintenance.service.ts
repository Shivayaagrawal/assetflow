import { AllocationRepository } from "@/modules/allocation/repositories/allocation.repository";
import { AssetStateMachine } from "@/modules/asset/domain/asset-state-machine";
import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import { MaintenancePolicy } from "@/modules/maintenance/policies/maintenance.policy";
import { MaintenanceRequestRepository } from "@/modules/maintenance/repositories/maintenance-request.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class ResolveMaintenanceService {
  async execute(user: SessionUser, requestId: string) {
    const request = await new MaintenanceRequestRepository().findById(requestId);
    if (!request) throw new NotFoundError("MAINT_001");

    MaintenancePolicy.assertCanManageForDepartment(
      user,
      request.asset.departmentId,
      request.raisedBy.departmentId
    );

    if (request.status === "REJECTED") {
      throw new ConflictError("MAINT_004");
    }
    if (request.status !== "IN_PROGRESS") {
      throw new ConflictError("MAINT_005");
    }

    const asset = await new AssetRepository().findById(request.assetId);
    if (!asset) throw new NotFoundError("ASSET_001");

    const activeAllocation = await new AllocationRepository().findActiveByAsset(
      request.assetId
    );
    const targetStatus = activeAllocation ? "ALLOCATED" : "AVAILABLE";
    AssetStateMachine.assertTransition(asset.status, targetStatus);

    return withTransaction(async (tx) => {
      const maintenanceRepo = new MaintenanceRequestRepository(tx);
      const assetRepo = new AssetRepository(tx);

      const fromStatus = "IN_PROGRESS";

      await maintenanceRepo.updateStatus(requestId, fromStatus, {
        status: "RESOLVED",
        resolvedAt: new Date(),
      });

      if (asset.status === "UNDER_MAINTENANCE") {
        await assetRepo.updateStatus(request.assetId, targetStatus);
      }

      await logActivity(tx, {
        actorId: user.id,
        action: "MAINTENANCE_RESOLVED",
        entityType: "MaintenanceRequest",
        entityId: request.id,
        oldValue: { status: fromStatus, assetStatus: asset.status },
        newValue: { status: "RESOLVED", assetStatus: targetStatus },
      });

      return maintenanceRepo.findByIdOrThrow(requestId);
    });
  }
}

export const resolveMaintenanceService = new ResolveMaintenanceService();
