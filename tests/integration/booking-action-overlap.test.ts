import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/shared/types/action-result";

const mockSessionUser = vi.fn<() => Promise<SessionUser>>();

vi.mock("@/shared/auth/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/auth/session")>();
  return {
    ...actual,
    requireSessionUser: () => mockSessionUser(),
  };
});

import { createBookingAction } from "@/modules/booking/actions/create-booking.action";

describe("booking overlap via createBookingAction", () => {
  const runId = Date.now().toString(36);
  let assetId = "";
  let userId = "";
  let categoryId = "";
  let acceptedBookingId = "";

  beforeAll(async () => {
    const category = await prisma.assetCategory.create({
      data: { name: `Action Overlap Rooms ${runId}` },
    });
    categoryId = category.id;

    const asset = await prisma.asset.create({
      data: {
        name: "Action Overlap Test Room",
        assetTag: `AF-ACT-${runId}`,
        serialNumber: `SN-ACT-${runId}`,
        categoryId,
        status: "AVAILABLE",
        isBookable: true,
        location: "Test Floor",
      },
    });
    assetId = asset.id;

    const user = await prisma.user.create({
      data: {
        name: "Action Overlap Tester",
        email: `action-overlap-${runId}@assetflow.demo`,
        emailVerified: true,
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    });
    userId = user.id;

    mockSessionUser.mockResolvedValue({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "EMPLOYEE",
      status: "ACTIVE",
      departmentId: null,
    });

    const baseStart = new Date("2027-06-15T09:00:00+05:30");
    const baseEnd = new Date("2027-06-15T10:00:00+05:30");

    await prisma.booking.create({
      data: {
        assetId,
        bookedById: userId,
        startTime: baseStart,
        endTime: baseEnd,
        status: "UPCOMING",
      },
    });
  });

  afterAll(async () => {
    if (acceptedBookingId) {
      await prisma.booking.delete({ where: { id: acceptedBookingId } }).catch(() => undefined);
    }
    await prisma.booking.deleteMany({ where: { assetId } }).catch(() => undefined);
    await prisma.notification.deleteMany({ where: { recipientId: userId } }).catch(() => undefined);
    await prisma.activityLog.deleteMany({ where: { actorId: userId } }).catch(() => undefined);
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    await prisma.assetCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  it("rejects overlapping slot through server action", async () => {
    const result = await createBookingAction({
      assetId,
      startTime: new Date("2027-06-15T09:30:00+05:30"),
      endTime: new Date("2027-06-15T10:30:00+05:30"),
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("BOOKING_002");
  });

  it("accepts adjacent slot through server action", async () => {
    const result = await createBookingAction({
      assetId,
      startTime: new Date("2027-06-15T10:00:00+05:30"),
      endTime: new Date("2027-06-15T11:00:00+05:30"),
    });

    expect(result.success).toBe(true);
    expect(result.data?.status).toBe("UPCOMING");
    acceptedBookingId = result.data?.id ?? "";
  });
});
