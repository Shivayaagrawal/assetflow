import { prisma } from "@/shared/database";
import { createNotification } from "@/modules/notification/services/create-notification.service";

const REMINDER_WINDOW_MINUTES = 30;

export async function runBookingReminderScan() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const upcoming = await prisma.booking.findMany({
    where: {
      status: "UPCOMING",
      startTime: { gt: now, lte: windowEnd },
    },
    include: {
      asset: { select: { name: true } },
    },
  });

  let created = 0;

  for (const booking of upcoming) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.notification.findFirst({
        where: {
          type: "BOOKING_REMINDER",
          relatedEntityId: booking.id,
          recipientId: booking.bookedById,
        },
      });
      if (existing) return;

      await createNotification(tx, {
        recipientId: booking.bookedById,
        type: "BOOKING_REMINDER",
        message: `Reminder: ${booking.asset.name} booking starts at ${booking.startTime.toISOString()}`,
        relatedEntityType: "Booking",
        relatedEntityId: booking.id,
      });
      created++;
    });
  }

  return { scanned: upcoming.length, created, windowMinutes: REMINDER_WINDOW_MINUTES };
}
