import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import { BookingPolicy } from "@/modules/booking/policies/booking.policy";
import { BookingRepository } from "@/modules/booking/repositories/booking.repository";
import type { CreateBookingInput } from "@/modules/booking/validators/create-booking.schema";
import { createNotification } from "@/modules/notification/services/create-notification.service";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { NotFoundError, ValidationError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class CreateBookingService {
  constructor(
    private readonly bookings = new BookingRepository(),
    private readonly assets = new AssetRepository()
  ) {}

  async execute(user: SessionUser, input: CreateBookingInput) {
    const asset = await this.assets.findById(input.assetId);
    if (!asset) throw new NotFoundError("ASSET_001");

    BookingPolicy.assertCanCreate(user, asset);

    if (input.startTime < new Date()) {
      throw new ValidationError("Cannot book in the past");
    }

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
        message: `Booking confirmed: ${asset.name}`,
        relatedEntityType: "Booking",
        relatedEntityId: booking.id,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "BOOKING_CREATED",
        entityType: "Booking",
        entityId: booking.id,
        newValue: {
          description: `${user.name} booked ${asset.assetTag} · ${asset.name}`,
          assetTag: asset.assetTag,
          startTime: input.startTime,
          endTime: input.endTime,
        },
      });

      return booking;
    });
  }
}

export const createBookingService = new CreateBookingService();
