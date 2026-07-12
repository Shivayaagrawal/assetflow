import type { NotificationType, Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export async function createNotification(
  tx: TxClient,
  input: {
    recipientId: string;
    type: NotificationType;
    message: string;
    relatedEntityType: string;
    relatedEntityId: string;
  }
) {
  return tx.notification.create({
    data: { ...input, isRead: false },
  });
}
