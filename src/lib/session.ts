import { headers } from "next/headers";
import { auth } from "@/lib/auth";

type UserRole = "EMPLOYEE" | "DEPARTMENT_HEAD" | "ASSET_MANAGER" | "ADMIN";

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireSession();
  const role = (session.user as { role?: UserRole }).role;
  if (!role || !roles.includes(role)) throw new Error("FORBIDDEN");
  return session;
}

export async function requireDepartmentAccess(departmentId: string) {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const user = session.user as { role?: UserRole; departmentId?: string };
  if (
    user.role === "DEPARTMENT_HEAD" &&
    user.departmentId !== departmentId
  ) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
