import type { SessionUser } from "@/shared/types/action-result";
import { AppError, AuthorizationError } from "@/shared/errors/app-error";

const MANAGER_ROLES = new Set<SessionUser["role"]>([
  "ASSET_MANAGER",
  "ADMIN",
  "DEPARTMENT_HEAD",
]);

export const MaintenancePolicy = {
  assertCanRaise(user: SessionUser) {
    if (user.role !== "EMPLOYEE" || user.status !== "ACTIVE") {
      throw new AuthorizationError("AUTH_007");
    }
  },

  assertCanManage(user: SessionUser) {
    if (!MANAGER_ROLES.has(user.role)) {
      throw new AuthorizationError("AUTH_007");
    }
  },

  assertCanManageForDepartment(
    user: SessionUser,
    assetDepartmentId: string | null,
    raisedByDepartmentId: string | null
  ) {
    this.assertCanManage(user);
    if (user.role !== "DEPARTMENT_HEAD") return;
    const scope = assetDepartmentId ?? raisedByDepartmentId;
    if (!scope || user.departmentId !== scope) {
      throw new AuthorizationError("AUTH_007");
    }
  },

  assertNotSelfApproval(userId: string, raisedById: string) {
    if (userId === raisedById) {
      throw new AppError("MAINT_003");
    }
  },
};
