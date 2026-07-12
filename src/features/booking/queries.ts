import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function listBookableAssets() {
  await requireSession();

  return prisma.asset.findMany({
    where: {
      isBookable: true,
      status: { in: ["AVAILABLE", "RESERVED"] },
    },
    orderBy: [{ location: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      assetTag: true,
      location: true,
      status: true,
    },
  });
}

export async function listUpcomingDepartmentBookings(departmentId: string) {
  await requireSession();

  return prisma.booking.findMany({
    where: {
      bookedBy: { departmentId },
      status: "UPCOMING",
      startTime: { gte: new Date() },
    },
    orderBy: { startTime: "asc" },
    take: 20,
    include: {
      asset: { select: { id: true, name: true, assetTag: true, location: true } },
      bookedBy: { select: { id: true, name: true } },
    },
  });
}
