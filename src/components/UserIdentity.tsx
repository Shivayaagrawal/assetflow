import { prisma } from "@/lib/db";
import { ROLE_LABELS } from "@/shared/navigation/nav-config";
import type { UserRole } from "@prisma/client";

type UserIdentityProps = {
  userId: string;
};

export async function UserIdentity({ userId }: UserIdentityProps) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      role: true,
      department: { select: { name: true } },
    },
  });

  if (!user) return null;

  return (
    <div className="user-identity" title={user.email}>
      <strong>{user.name}</strong>
      <span className="user-identity-meta">
        {ROLE_LABELS[user.role as UserRole]}
        {user.department ? ` · ${user.department.name}` : ""}
      </span>
    </div>
  );
}
