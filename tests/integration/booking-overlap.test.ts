import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { ConflictError } from "@/shared/errors/app-error";
import { mapPrismaError } from "@/shared/database/map-prisma-error";

function isBookingOverlap(error: unknown) {
  try {
    mapPrismaError(error);
    return false;
  } catch (mapped) {
    return mapped instanceof ConflictError && mapped.code === "BOOKING_002";
  }
}

describe("booking overlap integration", () => {
  const runId = Date.now().toString(36);
  let assetId = "";
  let userId = "";
  let categoryId = "";
  let acceptedBookingId = "";

  beforeAll(async () => {
    const category = await prisma.assetCategory.create({
      data: { name: `Test Rooms ${runId}` },
    });
    categoryId = category.id;

    const asset = await prisma.asset.create({
      data: {
        name: "Overlap Test Room",
        assetTag: `AF-TST-${runId}`,
        serialNumber: `SN-TST-${runId}`,
        categoryId,
        status: "AVAILABLE",
        isBookable: true,
        location: "Test Floor",
      },
    });
    assetId = asset.id;

    const user = await prisma.user.create({
      data: {
        name: "Overlap Tester",
        email: `overlap-${runId}@assetflow.demo`,
        emailVerified: true,
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    });
    userId = user.id;

    const baseDate = new Date("2026-07-12T09:00:00+05:30");
    const endDate = new Date("2026-07-12T10:00:00+05:30");

    await prisma.booking.create({
      data: {
        assetId,
        bookedById: userId,
        startTime: baseDate,
        endTime: endDate,
        status: "UPCOMING",
      },
    });
  });

  afterAll(async () => {
    if (acceptedBookingId) {
      await prisma.booking.delete({ where: { id: acceptedBookingId } }).catch(() => undefined);
    }
    await prisma.booking.deleteMany({ where: { assetId } }).catch(() => undefined);
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.assetCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  it("rejects overlapping slot 09:30-10:30 vs existing 09:00-10:00", async () => {
    await expect(
      prisma.booking.create({
        data: {
          assetId,
          bookedById: userId,
          startTime: new Date("2026-07-12T09:30:00+05:30"),
          endTime: new Date("2026-07-12T10:30:00+05:30"),
          status: "UPCOMING",
        },
      })
    ).rejects.toSatisfy(isBookingOverlap);
  });

  it("accepts adjacent slot 10:00-11:00", async () => {
    const booking = await prisma.booking.create({
      data: {
        assetId,
        bookedById: userId,
        startTime: new Date("2026-07-12T10:00:00+05:30"),
        endTime: new Date("2026-07-12T11:00:00+05:30"),
        status: "UPCOMING",
      },
    });

    acceptedBookingId = booking.id;
    expect(booking.status).toBe("UPCOMING");
  });
});
