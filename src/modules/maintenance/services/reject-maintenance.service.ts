import { MaintenancePolicy } from "@/modules/maintenance/policies/maintenance.policy";
import { MaintenanceRequestRepository } from "@/modules/maintenance/repositories/maintenance-request.repository";
import type { RejectMaintenanceInput } from "@/modules/maintenance/validators/maintenance.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { createNotification } from "@/modules/notification/services/create-notification.service";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class RejectMaintenanceService {
  async execute(user: SessionUser, input: RejectMaintenanceInput) {
    const request = await new MaintenanceRequestRepository().findById(input.requestId);
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

    return withTransaction(async (tx) => {
      const maintenanceRepo = new MaintenanceRequestRepository(tx);

      await maintenanceRepo.updateStatus(input.requestId, "PENDING", {
        status: "REJECTED",
        approvedBy: { connect: { id: user.id } },
        approvedAt: new Date(),
      });

      await createNotification(tx, {
        recipientId: request.raisedById,
        type: "MAINTENANCE_REJECTED",
        message: `Maintenance rejected for ${request.asset.assetTag}`,
        relatedEntityType: "MaintenanceRequest",
        relatedEntityId: request.id,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "MAINTENANCE_REJECTED",
        entityType: "MaintenanceRequest",
        entityId: request.id,
        oldValue: { status: "PENDING" },
        newValue: { status: "REJECTED", reason: input.reason ?? null },
      });

      return maintenanceRepo.findByIdOrThrow(input.requestId);
    });
  }
}

export const rejectMaintenanceService = new RejectMaintenanceService();
