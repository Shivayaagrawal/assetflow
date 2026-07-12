import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class BookingRepository {
  constructor(private readonly db: Tx = prisma) {}

  findById(id: string) {
    return this.db.booking.findUnique({ where: { id }, include: { asset: true } });
  }

  findByIdOrThrow(id: string) {
    return this.db.booking.findUniqueOrThrow({ where: { id }, include: { asset: true } });
  }

  findByBooker(bookedById: string, take = 20) {
    return this.db.booking.findMany({
      where: { bookedById },
      orderBy: { startTime: "desc" },
      take,
      include: {
        asset: { select: { assetTag: true, name: true, location: true } },
      },
    });
  }

  findUpcomingByDepartment(departmentId: string) {
    return this.db.booking.findMany({
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

  listBookableAssets() {
    return this.db.asset.findMany({
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

  create(data: Prisma.BookingCreateInput) {
    return this.db.booking.create({ data });
  }

  cancel(id: string) {
    return this.db.booking.update({
      where: { id },
      data: { status: "CANCELLED" satisfies BookingStatus },
    });
  }

  reschedule(id: string, startTime: Date, endTime: Date) {
    return this.db.booking.update({
      where: { id },
      data: { startTime, endTime, status: "UPCOMING" },
    });
  }
}
