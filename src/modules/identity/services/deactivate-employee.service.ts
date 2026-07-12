import { UserPolicy } from "@/modules/identity/policies/user.policy";
import { assertLastAdminGuard } from "@/modules/identity/domain/last-admin.guard";
import { SessionRepository } from "@/modules/identity/repositories/session.repository";
import { UserRepository } from "@/modules/identity/repositories/user.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class DeactivateEmployeeService {
  async execute(user: SessionUser, userId: string) {
    UserPolicy.assertCanManage(user);

    return withTransaction(async (tx) => {
      await assertLastAdminGuard(tx, userId, "ADMIN", "INACTIVE");

      const userRepo = new UserRepository(tx);
      const sessionRepo = new SessionRepository(tx);
      const previous = await userRepo.findByIdOrThrow(userId);

      await sessionRepo.deleteByUserId(userId);
      const deactivated = await userRepo.deactivate(userId);

      await logActivity(tx, {
        actorId: user.id,
        action: "EMPLOYEE_DEACTIVATED",
        entityType: "User",
        entityId: deactivated.id,
        oldValue: previous,
        newValue: deactivated,
      });

      return deactivated;
    });
  }
}

export const deactivateEmployeeService = new DeactivateEmployeeService();
