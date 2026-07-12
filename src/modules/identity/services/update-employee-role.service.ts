import { UserPolicy } from "@/modules/identity/policies/user.policy";
import { assertLastAdminGuard } from "@/modules/identity/domain/last-admin.guard";
import { SessionRepository } from "@/modules/identity/repositories/session.repository";
import { UserRepository } from "@/modules/identity/repositories/user.repository";
import { DepartmentRepository } from "@/modules/organization/repositories/department.repository";
import type { EmployeeRoleInput } from "@/modules/identity/validators/employee-role.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ValidationError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class UpdateEmployeeRoleService {
  async execute(user: SessionUser, input: EmployeeRoleInput) {
    UserPolicy.assertCanManage(user);

    if (input.role === "DEPARTMENT_HEAD" && !input.departmentId) {
      throw new ValidationError("Department head must be assigned to a department");
    }

    return withTransaction(async (tx) => {
      const userRepo = new UserRepository(tx);
      const deptRepo = new DepartmentRepository(tx);
      const sessionRepo = new SessionRepository(tx);

      const previous = await userRepo.findByIdOrThrow(input.userId);
      const nextStatus = input.status ?? previous.status;
      const nextRole = input.role;

      await assertLastAdminGuard(tx, input.userId, nextRole, nextStatus);

      if (previous.role === "DEPARTMENT_HEAD") {
        await deptRepo.clearHead(previous.id);
      }

      const updated = await userRepo.updateRoleAndStatus(input.userId, {
        role: input.role,
        status: nextStatus,
        departmentId: input.departmentId ?? null,
      });

      if (nextStatus === "INACTIVE" && previous.status === "ACTIVE") {
        await sessionRepo.deleteByUserId(input.userId);
      }

      if (input.role === "DEPARTMENT_HEAD" && input.departmentId) {
        const department = await deptRepo.findHeadId(input.departmentId);
        if (department?.headId && department.headId !== updated.id) {
          await userRepo.demoteToEmployee(department.headId);
        }
        await deptRepo.assignHead(input.departmentId, updated.id);
      }

      await logActivity(tx, {
        actorId: user.id,
        action: "EMPLOYEE_ROLE_UPDATED",
        entityType: "User",
        entityId: updated.id,
        oldValue: previous,
        newValue: updated,
      });

      return updated;
    });
  }
}

export const updateEmployeeRoleService = new UpdateEmployeeRoleService();
