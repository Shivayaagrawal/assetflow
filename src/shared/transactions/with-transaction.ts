import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { mapPrismaError } from "@/shared/database/map-prisma-error";

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await prisma.$transaction(fn);
  } catch (error) {
    mapPrismaError(error);
  }
}
