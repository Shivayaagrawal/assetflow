import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export async function logActivity(
  tx: TxClient,
  input: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValue?: unknown;
    newValue?: unknown;
  }
) {
  return tx.activityLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
    },
  });
}
