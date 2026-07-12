"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createNotification } from "@/features/notifications/create-notification";
import { logActivity } from "@/features/activity-log/log-activity";

const departmentBookingInput = z.object({
  assetId: z.string().min(1),
  departmentId: z.string().min(1),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
});

export async function bookResourceForDepartment(
  input: z.input<typeof departmentBookingInput>
) {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const data = departmentBookingInput.parse(input);
  const actor = session.user as {
    id: string;
    role?: string;
    departmentId?: string | null;
  };

  if (data.endTime <= data.startTime) {
    throw new Error("BOOK_001");
  }

  if (actor.role === "DEPARTMENT_HEAD" && actor.departmentId !== data.departmentId) {
    throw new Error("FORBIDDEN");
  }

  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id: data.assetId },
    select: { id: true, name: true, isBookable: true },
  });

  if (!asset.isBookable) {
    throw new Error("BOOK_002");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          assetId: data.assetId,
          bookedById: actor.id,
          startTime: data.startTime,
          endTime: data.endTime,
          status: "UPCOMING",
        },
      });

      await createNotification(tx, {
        recipientId: actor.id,
        type: "BOOKING_CONFIRMED",
        message: `Booking confirmed for ${asset.name}`,
        relatedEntityType: "Booking",
        relatedEntityId: booking.id,
      });

      await logActivity(tx, {
        actorId: actor.id,
        actionType: "DEPARTMENT_BOOKING_CREATED",
        targetEntityType: "Booking",
        targetEntityId: booking.id,
        description: `Booked ${asset.name} on behalf of department`,
        newValue: booking,
      });

      return booking;
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("23P01") || error.message.includes("no_overlapping"))
    ) {
      throw new Error("BOOK_003");
    }
    throw error;
  }
}
