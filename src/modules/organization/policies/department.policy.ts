import type { SessionUser } from "@/shared/types/action-result";
import { AuthorizationError } from "@/shared/errors/app-error";

export const DepartmentPolicy = {
  canManage(user: SessionUser) {
    return user.role === "ADMIN";
  },

  canViewDepartment(user: SessionUser, departmentId: string) {
    if (user.role === "ADMIN" || user.role === "ASSET_MANAGER") return true;
    if (user.role === "DEPARTMENT_HEAD") {
      return user.departmentId === departmentId;
    }
    return user.departmentId === departmentId;
  },

  assertCanManage(user: SessionUser) {
    if (!this.canManage(user)) throw new AuthorizationError("AUTH_007");
  },

  assertCanViewDepartment(user: SessionUser, departmentId: string) {
    if (!this.canViewDepartment(user, departmentId)) {
      throw new AuthorizationError("AUTH_007");
    }
  },
};
