import { BookingPolicy } from "@/modules/booking/policies/booking.policy";
import { BookingRepository } from "@/modules/booking/repositories/booking.repository";
import type { RescheduleBookingInput } from "@/modules/booking/validators/booking.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class RescheduleBookingService {
  async execute(user: SessionUser, input: RescheduleBookingInput) {
    const booking = await new BookingRepository().findByIdOrThrow(input.bookingId);
    BookingPolicy.assertCanModify(user, booking);

    if (input.endTime <= input.startTime) {
      throw new ConflictError("BOOKING_003");
    }

    return withTransaction(async (tx) => {
      const bookingRepo = new BookingRepository(tx);
      const updated = await bookingRepo.reschedule(
        booking.id,
        input.startTime,
        input.endTime
      );

      await logActivity(tx, {
        actorId: user.id,
        action: "BOOKING_RESCHEDULED",
        entityType: "Booking",
        entityId: booking.id,
        oldValue: { startTime: booking.startTime, endTime: booking.endTime },
        newValue: { startTime: updated.startTime, endTime: updated.endTime },
      });

      return updated;
    });
  }
}

export const rescheduleBookingService = new RescheduleBookingService();
