import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

export function toSessionUser(user: {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: SessionUser["status"];
  departmentId: string | null;
}): SessionUser {
  if (user.status !== "ACTIVE") {
    throw new AuthenticationError("AUTH_003");
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    departmentId: user.departmentId,
  };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      departmentId: true,
    },
  });
  if (!user) throw new AuthenticationError("AUTH_002");
  return toSessionUser(user);
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
