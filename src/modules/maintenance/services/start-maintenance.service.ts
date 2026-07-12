import { MaintenancePolicy } from "@/modules/maintenance/policies/maintenance.policy";
import { MaintenanceRequestRepository } from "@/modules/maintenance/repositories/maintenance-request.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class StartMaintenanceService {
  async execute(user: SessionUser, requestId: string) {
    const request = await new MaintenanceRequestRepository().findById(requestId);
    if (!request) throw new NotFoundError("MAINT_001");

    MaintenancePolicy.assertCanManageForDepartment(
      user,
      request.asset.departmentId,
      request.raisedBy.departmentId
    );

    if (request.status !== "TECHNICIAN_ASSIGNED") {
      throw new ConflictError("MAINT_005");
    }

    return withTransaction(async (tx) => {
      const maintenanceRepo = new MaintenanceRequestRepository(tx);

      await maintenanceRepo.updateStatus(
        requestId,
        "TECHNICIAN_ASSIGNED",
        { status: "IN_PROGRESS" }
      );

      await logActivity(tx, {
        actorId: user.id,
        action: "MAINTENANCE_STARTED",
        entityType: "MaintenanceRequest",
        entityId: request.id,
        oldValue: { status: "TECHNICIAN_ASSIGNED" },
        newValue: { status: "IN_PROGRESS" },
      });

      return maintenanceRepo.findByIdOrThrow(requestId);
    });
  }
}

export const startMaintenanceService = new StartMaintenanceService();
