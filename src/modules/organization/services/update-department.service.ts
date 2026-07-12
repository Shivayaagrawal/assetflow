import { DepartmentPolicy } from "@/modules/organization/policies/department.policy";
import { assertNoDepartmentCycle } from "@/modules/organization/domain/department-cycle";
import { DepartmentRepository } from "@/modules/organization/repositories/department.repository";
import { UserRepository } from "@/modules/identity/repositories/user.repository";
import type { DepartmentInput } from "@/modules/organization/validators/organization.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class UpdateDepartmentService {
  async execute(user: SessionUser, departmentId: string, input: DepartmentInput) {
    DepartmentPolicy.assertCanManage(user);
    const parentId = input.parentId ?? input.parentDepartmentId ?? null;

    return withTransaction(async (tx) => {
      await assertNoDepartmentCycle(tx, departmentId, parentId);

      const deptRepo = new DepartmentRepository(tx);
      const userRepo = new UserRepository(tx);
      const previous = await deptRepo.findByIdOrThrow(departmentId);

      const department = await deptRepo.update(departmentId, {
        name: input.name,
        parentId,
        headId: input.headId ?? null,
      });

      if (previous.headId && previous.headId !== input.headId) {
        await userRepo.demoteToEmployee(previous.headId);
      }

      if (input.headId) {
        await userRepo.promoteDepartmentHead(input.headId, departmentId);
      }

      await logActivity(tx, {
        actorId: user.id,
        action: "DEPARTMENT_UPDATED",
        entityType: "Department",
        entityId: department.id,
        oldValue: previous,
        newValue: department,
      });

      return department;
    });
  }
}

export const updateDepartmentService = new UpdateDepartmentService();
