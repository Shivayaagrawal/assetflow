import type { Prisma } from "@prisma/client";
import { ConflictError } from "@/shared/errors/app-error";

type Tx = Prisma.TransactionClient;

export async function assertNoDepartmentCycle(
  tx: Tx,
  departmentId: string | null,
  parentId: string | null
) {
  if (!parentId) return;

  if (departmentId && parentId === departmentId) {
    throw new ConflictError("ORG_002");
  }

  let currentId: string | null = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (departmentId && currentId === departmentId) {
      throw new ConflictError("ORG_002");
    }
    if (visited.has(currentId)) {
      throw new ConflictError("ORG_002");
    }
    visited.add(currentId);

    const department: { parentId: string | null } | null = await tx.department.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    });

    if (!department) break;
    currentId = department.parentId;
  }
}
