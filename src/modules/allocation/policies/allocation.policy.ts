import type { SessionUser } from "@/shared/types/action-result";
import { AuthorizationError } from "@/shared/errors/app-error";

const MANAGER_ROLES = new Set<SessionUser["role"]>(["ASSET_MANAGER", "ADMIN"]);

export const AllocationPolicy = {
  canAllocate(user: SessionUser) {
    return MANAGER_ROLES.has(user.role);
  },

  canReturn(user: SessionUser) {
    return user.status === "ACTIVE";
  },

  assertCanAllocate(user: SessionUser) {
    if (!this.canAllocate(user)) throw new AuthorizationError("AUTH_007");
  },

  assertCanReturn(user: SessionUser) {
    if (!this.canReturn(user)) throw new AuthorizationError("AUTH_007");
  },

  assertCanRequestTransfer(user: SessionUser) {
    if (user.role !== "EMPLOYEE" || user.status !== "ACTIVE") {
      throw new AuthorizationError("AUTH_007");
    }
  },

  assertCanDecideTransfer(user: SessionUser, departmentId: string | null) {
    if (user.role === "DEPARTMENT_HEAD") {
      if (!departmentId || user.departmentId !== departmentId) {
        throw new AuthorizationError("AUTH_007");
      }
      return;
    }
    if (!MANAGER_ROLES.has(user.role)) {
      throw new AuthorizationError("AUTH_007");
    }
  },
};
