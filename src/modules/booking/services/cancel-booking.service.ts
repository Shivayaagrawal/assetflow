import { BookingPolicy } from "@/modules/booking/policies/booking.policy";
import { BookingRepository } from "@/modules/booking/repositories/booking.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class CancelBookingService {
  async execute(user: SessionUser, bookingId: string) {
    const booking = await new BookingRepository().findByIdOrThrow(bookingId);
    BookingPolicy.assertCanModify(user, booking);

    return withTransaction(async (tx) => {
      const bookingRepo = new BookingRepository(tx);
      const cancelled = await bookingRepo.cancel(bookingId);

      await logActivity(tx, {
        actorId: user.id,
        action: "BOOKING_CANCELLED",
        entityType: "Booking",
        entityId: booking.id,
        oldValue: { status: booking.status },
        newValue: { status: cancelled.status },
      });

      return cancelled;
    });
  }
}

export const cancelBookingService = new CancelBookingService();
