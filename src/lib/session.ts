import type { UserRole } from "@prisma/client";
import {
  assertDepartmentAccess,
  assertRole,
  requireSession,
  requireSessionUser,
  toSessionUser,
} from "@/shared/auth/session";
import { AuthorizationError } from "@/shared/errors/app-error";

export {
  assertDepartmentAccess,
  assertRole,
  requireSession,
  requireSessionUser,
  toSessionUser,
};

export function canAccessDepartment(input: {
  role?: UserRole;
  userDepartmentId?: string | null;
  targetDepartmentId: string;
}) {
  if (input.role === "ASSET_MANAGER" || input.role === "ADMIN") return true;
  if (input.role !== "DEPARTMENT_HEAD") return false;
  return input.userDepartmentId === input.targetDepartmentId;
}

type LegacySession = {
  user: {
    id: string;
    name: string;
    email: string;
    role?: UserRole;
    departmentId?: string | null;
  };
};

/** Legacy helper used by feature-layer pages during incremental module migration. */
export async function requireRole(...roles: UserRole[]): Promise<LegacySession> {
  const user = await requireSessionUser();
  assertRole(user, ...roles);
  return { user };
}

/** Legacy helper used by feature-layer pages during incremental module migration. */
export async function requireDepartmentAccess(
  departmentId: string
): Promise<LegacySession> {
  const user = await requireSessionUser();
  if (
    !canAccessDepartment({
      role: user.role,
      userDepartmentId: user.departmentId,
      targetDepartmentId: departmentId,
    })
  ) {
    throw new AuthorizationError("AUTH_007");
  }
  return { user };
}
