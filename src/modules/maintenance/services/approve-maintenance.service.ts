import { AssetStateMachine } from "@/modules/asset/domain/asset-state-machine";
import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import { MaintenancePolicy } from "@/modules/maintenance/policies/maintenance.policy";
import { MaintenanceRequestRepository } from "@/modules/maintenance/repositories/maintenance-request.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { createNotification } from "@/modules/notification/services/create-notification.service";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class ApproveMaintenanceService {
  async execute(user: SessionUser, requestId: string) {
    const request = await new MaintenanceRequestRepository().findById(requestId);
    if (!request) throw new NotFoundError("MAINT_001");

    MaintenancePolicy.assertCanManageForDepartment(
      user,
      request.asset.departmentId,
      request.raisedBy.departmentId
    );
    MaintenancePolicy.assertNotSelfApproval(user.id, request.raisedById);

    if (request.status !== "PENDING") {
      throw new ConflictError("MAINT_005");
    }

    const asset = await new AssetRepository().findById(request.assetId);
    if (!asset) throw new NotFoundError("ASSET_001");

    AssetStateMachine.assertTransition(asset.status, "UNDER_MAINTENANCE");

    return withTransaction(async (tx) => {
      const maintenanceRepo = new MaintenanceRequestRepository(tx);
      const assetRepo = new AssetRepository(tx);

      await maintenanceRepo.updateStatus(requestId, "PENDING", {
        status: "APPROVED",
        approvedBy: { connect: { id: user.id } },
        approvedAt: new Date(),
      });

      await assetRepo.updateStatus(request.assetId, "UNDER_MAINTENANCE");

      await createNotification(tx, {
        recipientId: request.raisedById,
        type: "MAINTENANCE_APPROVED",
        message: `Maintenance approved for ${request.asset.assetTag}`,
        relatedEntityType: "MaintenanceRequest",
        relatedEntityId: request.id,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "MAINTENANCE_APPROVED",
        entityType: "MaintenanceRequest",
        entityId: request.id,
        oldValue: { status: "PENDING", assetStatus: asset.status },
        newValue: { status: "APPROVED", assetStatus: "UNDER_MAINTENANCE" },
      });

      return maintenanceRepo.findByIdOrThrow(requestId);
    });
  }
}

export const approveMaintenanceService = new ApproveMaintenanceService();
