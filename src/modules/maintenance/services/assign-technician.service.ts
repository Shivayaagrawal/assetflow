import { MaintenancePolicy } from "@/modules/maintenance/policies/maintenance.policy";
import { MaintenanceRequestRepository } from "@/modules/maintenance/repositories/maintenance-request.repository";
import type { AssignTechnicianInput } from "@/modules/maintenance/validators/maintenance.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class AssignTechnicianService {
  async execute(user: SessionUser, input: AssignTechnicianInput) {
    const request = await new MaintenanceRequestRepository().findById(input.requestId);
    if (!request) throw new NotFoundError("MAINT_001");

    MaintenancePolicy.assertCanManageForDepartment(
      user,
      request.asset.departmentId,
      request.raisedBy.departmentId
    );

    if (request.status !== "APPROVED") {
      throw new ConflictError("MAINT_005");
    }

    return withTransaction(async (tx) => {
      const maintenanceRepo = new MaintenanceRequestRepository(tx);

      await maintenanceRepo.updateStatus(input.requestId, "APPROVED", {
        status: "TECHNICIAN_ASSIGNED",
        technicianName: input.technicianName,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "MAINTENANCE_TECHNICIAN_ASSIGNED",
        entityType: "MaintenanceRequest",
        entityId: request.id,
        oldValue: { status: "APPROVED" },
        newValue: { status: "TECHNICIAN_ASSIGNED", technicianName: input.technicianName },
      });

      return maintenanceRepo.findByIdOrThrow(input.requestId);
    });
  }
}

export const assignTechnicianService = new AssignTechnicianService();
