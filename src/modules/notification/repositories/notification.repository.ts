import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class NotificationRepository {
  constructor(private readonly db: Tx = prisma) {}

  listForRecipient(recipientId: string, limit = 50) {
    return this.db.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        message: true,
        relatedEntityType: true,
        relatedEntityId: true,
        isRead: true,
        createdAt: true,
      },
    });
  }

  countUnread(recipientId: string) {
    return this.db.notification.count({
      where: { recipientId, isRead: false },
    });
  }

  markRead(id: string, recipientId: string) {
    return this.db.notification.updateMany({
      where: { id, recipientId, isRead: false },
      data: { isRead: true },
    });
  }

  markAllRead(recipientId: string) {
    return this.db.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true },
    });
  }
}
