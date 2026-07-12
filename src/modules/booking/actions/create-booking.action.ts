"use server";

import { createBookingSchema } from "@/modules/booking/validators/create-booking.schema";
import { createBookingService } from "@/modules/booking/services/create-booking.service";
import { requireSessionUser } from "@/shared/auth/session";
import { runAction } from "@/shared/validation/run-action";

export async function createBookingAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = createBookingSchema.parse(input);
    return createBookingService.execute(user, data);
  });
}
