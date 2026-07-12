import { prisma } from "@/shared/database";
import { createNotification } from "@/modules/notification/services/create-notification.service";

export async function runOverdueScan() {
  const now = new Date();
  const overdue = await prisma.allocation.findMany({
    where: {
      status: "ACTIVE",
      expectedReturnDate: { lt: now },
    },
    include: { asset: true, holderEmployee: true },
  });

  let created = 0;

  for (const allocation of overdue) {
    if (!allocation.holderEmployeeId) continue;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.notification.findFirst({
        where: {
          relatedEntityId: allocation.id,
          type: "OVERDUE_RETURN_ALERT",
          recipientId: allocation.holderEmployeeId!,
        },
      });
      if (existing) return;

      await createNotification(tx, {
        recipientId: allocation.holderEmployeeId!,
        type: "OVERDUE_RETURN_ALERT",
        message: `${allocation.asset.name} was due back ${allocation.expectedReturnDate?.toISOString()}`,
        relatedEntityType: "Allocation",
        relatedEntityId: allocation.id,
      });
      created++;
    });
  }

  return { scanned: overdue.length, created };
}
