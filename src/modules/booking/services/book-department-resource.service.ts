import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import { BookingPolicy } from "@/modules/booking/policies/booking.policy";
import { BookingRepository } from "@/modules/booking/repositories/booking.repository";
import type { DepartmentBookingInput } from "@/modules/booking/validators/booking.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { createNotification } from "@/modules/notification/services/create-notification.service";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class BookDepartmentResourceService {
  async execute(user: SessionUser, input: DepartmentBookingInput) {
    BookingPolicy.assertDepartmentScope(user, input.departmentId);

    if (input.endTime <= input.startTime) {
      throw new ConflictError("BOOKING_003");
    }

    const asset = await new AssetRepository().findById(input.assetId);
    if (!asset) throw new NotFoundError("ASSET_001");
    BookingPolicy.assertCanCreate(user, asset);

    return withTransaction(async (tx) => {
      const bookingRepo = new BookingRepository(tx);
      const booking = await bookingRepo.create({
        asset: { connect: { id: asset.id } },
        bookedBy: { connect: { id: user.id } },
        startTime: input.startTime,
        endTime: input.endTime,
        status: "UPCOMING",
      });

      await createNotification(tx, {
        recipientId: user.id,
        type: "BOOKING_CONFIRMED",
        message: `Booking confirmed for ${asset.name}`,
        relatedEntityType: "Booking",
        relatedEntityId: booking.id,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "DEPARTMENT_BOOKING_CREATED",
        entityType: "Booking",
        entityId: booking.id,
        newValue: booking,
      });

      return booking;
    });
  }
}

export const bookDepartmentResourceService = new BookDepartmentResourceService();
