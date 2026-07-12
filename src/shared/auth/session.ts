import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  AuthenticationError,
  AuthorizationError,
} from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import type { UserRole } from "@prisma/client";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new AuthenticationError("AUTH_002");
  return session;
}

export function toSessionUser(session: {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
    status?: string;
    departmentId?: string | null;
  };
}): SessionUser {
  const user = session.user;
  if (user.status === "INACTIVE") {
    throw new AuthenticationError("AUTH_003");
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: (user.role as UserRole) ?? "EMPLOYEE",
    status: (user.status as SessionUser["status"]) ?? "ACTIVE",
    departmentId: user.departmentId ?? null,
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await requireSession();
  return toSessionUser(session);
}

export function assertRole(user: SessionUser, ...roles: UserRole[]) {
  if (!roles.includes(user.role)) {
    throw new AuthorizationError("AUTH_007");
  }
}

export function assertDepartmentAccess(user: SessionUser, departmentId: string) {
  if (user.role === "DEPARTMENT_HEAD" && user.departmentId !== departmentId) {
    throw new AuthorizationError("AUTH_007");
  }
}
