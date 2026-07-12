import type { SessionUser } from "@/shared/types/action-result";
import { AuthorizationError } from "@/shared/errors/app-error";

const MANAGER_ROLES = new Set<SessionUser["role"]>(["ASSET_MANAGER", "ADMIN"]);

export const AuditPolicy = {
  assertCanCreate(user: SessionUser) {
    if (!MANAGER_ROLES.has(user.role)) {
      throw new AuthorizationError("AUTH_007");
    }
  },

  assertCanClose(user: SessionUser) {
    if (!MANAGER_ROLES.has(user.role)) {
      throw new AuthorizationError("AUTH_007");
    }
  },

  assertCanVerify(user: SessionUser, assignedAuditorIds: string[]) {
    if (!assignedAuditorIds.includes(user.id)) {
      throw new AuthorizationError("AUTH_007");
    }
  },
};
