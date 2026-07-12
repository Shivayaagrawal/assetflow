import type { Prisma, UserRole, UserStatus } from "@prisma/client";
import { ConflictError } from "@/shared/errors/app-error";

type Tx = Prisma.TransactionClient;

export async function assertLastAdminGuard(
  tx: Tx,
  userId: string,
  nextRole: UserRole,
  nextStatus: UserStatus
) {
  const current = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true, status: true },
  });

  if (current.role !== "ADMIN" || current.status !== "ACTIVE") {
    return;
  }

  const removingAdmin =
    nextStatus === "INACTIVE" || nextStatus === "SUSPENDED" || nextRole !== "ADMIN";

  if (!removingAdmin) {
    return;
  }

  const otherActiveAdmins = await tx.user.count({
    where: {
      role: "ADMIN",
      status: "ACTIVE",
      id: { not: userId },
    },
  });

  if (otherActiveAdmins === 0) {
    throw new ConflictError("ORG_005");
  }
}
