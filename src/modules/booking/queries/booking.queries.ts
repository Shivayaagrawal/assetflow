import { prisma } from "@/shared/database";
import { requireSessionUser } from "@/shared/auth/session";

export async function listResourceBookingsInRange(
  start: Date,
  end: Date,
  assetId?: string
) {
  await requireSessionUser();

  return prisma.booking.findMany({
    where: {
      assetId,
      status: "UPCOMING",
      startTime: { lt: end },
      endTime: { gt: start },
    },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      assetId: true,
      startTime: true,
      endTime: true,
      status: true,
      asset: {
        select: { id: true, assetTag: true, name: true, location: true },
      },
      bookedBy: { select: { name: true } },
    },
  });
}

export function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfWeek(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}
