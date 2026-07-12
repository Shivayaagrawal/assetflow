import type { SessionUser } from "@/shared/types/action-result";
import { AuthorizationError } from "@/shared/errors/app-error";

export const UserPolicy = {
  canManage(user: SessionUser) {
    return user.role === "ADMIN";
  },

  assertCanManage(user: SessionUser) {
    if (!this.canManage(user)) {
      throw new AuthorizationError("AUTH_007");
    }
  },
};
