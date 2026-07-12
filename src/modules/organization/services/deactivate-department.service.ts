import { DepartmentPolicy } from "@/modules/organization/policies/department.policy";
import { DepartmentRepository } from "@/modules/organization/repositories/department.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class DeactivateDepartmentService {
  async execute(user: SessionUser, departmentId: string) {
    DepartmentPolicy.assertCanManage(user);

    return withTransaction(async (tx) => {
      const deptRepo = new DepartmentRepository(tx);
      const activeMembers = await deptRepo.countActiveMembers(departmentId);

      if (activeMembers > 0) {
        throw new ConflictError("ORG_003");
      }

      const department = await deptRepo.deactivate(departmentId);

      await logActivity(tx, {
        actorId: user.id,
        action: "DEPARTMENT_DEACTIVATED",
        entityType: "Department",
        entityId: department.id,
        newValue: department,
      });

      return department;
    });
  }
}

export const deactivateDepartmentService = new DeactivateDepartmentService();
