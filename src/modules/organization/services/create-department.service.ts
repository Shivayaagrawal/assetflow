import { DepartmentPolicy } from "@/modules/organization/policies/department.policy";
import { assertNoDepartmentCycle } from "@/modules/organization/domain/department-cycle";
import { DepartmentRepository } from "@/modules/organization/repositories/department.repository";
import { UserRepository } from "@/modules/identity/repositories/user.repository";
import type { DepartmentInput } from "@/modules/organization/validators/organization.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class CreateDepartmentService {
  constructor(
    private readonly departments = new DepartmentRepository(),
    private readonly users = new UserRepository()
  ) {}

  async execute(user: SessionUser, input: DepartmentInput) {
    DepartmentPolicy.assertCanManage(user);
    const parentId = input.parentId ?? input.parentDepartmentId ?? null;

    return withTransaction(async (tx) => {
      await assertNoDepartmentCycle(tx, null, parentId);

      const deptRepo = new DepartmentRepository(tx);
      const userRepo = new UserRepository(tx);

      const department = await deptRepo.create({
        name: input.name,
        parentId,
        headId: input.headId ?? null,
      });

      if (input.headId) {
        await userRepo.promoteDepartmentHead(input.headId, department.id);
      }

      await logActivity(tx, {
        actorId: user.id,
        action: "DEPARTMENT_CREATED",
        entityType: "Department",
        entityId: department.id,
        newValue: department,
      });

      return department;
    });
  }
}

export const createDepartmentService = new CreateDepartmentService();
