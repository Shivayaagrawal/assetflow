import type { Booking, BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class BookingRepository {
  constructor(private readonly db: Tx = prisma) {}

  findById(id: string) {
    return this.db.booking.findUnique({ where: { id }, include: { asset: true } });
  }

  findByAssetAndRange(assetId: string, startTime: Date, endTime: Date) {
    return this.db.booking.findMany({
      where: {
        assetId,
        status: { in: ["UPCOMING", "ONGOING"] },
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });
  }

  create(data: Prisma.BookingCreateInput) {
    return this.db.booking.create({ data });
  }

  updateStatus(id: string, status: BookingStatus) {
    return this.db.booking.update({ where: { id }, data: { status } });
  }
}

export type BookingEntity = Booking;
