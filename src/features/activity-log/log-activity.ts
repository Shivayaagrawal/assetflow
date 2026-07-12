import type { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export async function logActivity(
  tx: TxClient,
  input: {
    actorId: string;
    actionType: string;
    targetEntityType: string;
    targetEntityId: string;
    description: string;
    oldValue?: unknown;
    newValue?: unknown;
  }
) {
  return tx.activityLog.create({
    data: {
      actorId: input.actorId,
      actionType: input.actionType,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      description: input.description,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
    },
  });
}
