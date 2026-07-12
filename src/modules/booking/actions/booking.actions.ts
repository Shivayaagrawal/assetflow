"use server";

import { createBookingAction } from "@/modules/booking/actions/create-booking.action";
import { bookDepartmentResourceService } from "@/modules/booking/services/book-department-resource.service";
import { cancelBookingService } from "@/modules/booking/services/cancel-booking.service";
import { rescheduleBookingService } from "@/modules/booking/services/reschedule-booking.service";
import { BookingRepository } from "@/modules/booking/repositories/booking.repository";
import { createBookingSchema } from "@/modules/booking/validators/create-booking.schema";
import {
  departmentBookingSchema,
  rescheduleBookingSchema,
} from "@/modules/booking/validators/booking.schema";
import { requireSessionUser } from "@/shared/auth/session";
import { AppError } from "@/shared/errors/app-error";
import type { ErrorCode } from "@/shared/errors/codes";
import { runAction } from "@/shared/validation/run-action";
import { throwOnFailure } from "@/shared/validation/unwrap-action";

export async function bookDepartmentResourceAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = departmentBookingSchema.parse(input);
    return bookDepartmentResourceService.execute(user, data);
  });
}

export async function cancelBookingAction(bookingId: string) {
  return runAction(async () => {
    const user = await requireSessionUser();
    return cancelBookingService.execute(user, bookingId);
  });
}

export async function rescheduleBookingAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = rescheduleBookingSchema.parse(input);
    return rescheduleBookingService.execute(user, data);
  });
}

export async function bookResourceForDepartment(input: unknown) {
  return throwOnFailure(await bookDepartmentResourceAction(input));
}

export async function cancelBooking(bookingId: string) {
  return throwOnFailure(await cancelBookingAction(bookingId));
}

export async function rescheduleBooking(input: unknown) {
  return throwOnFailure(await rescheduleBookingAction(input));
}

export async function createEmployeeBooking(input: unknown) {
  const data = createBookingSchema.parse(input);
  const result = await createBookingAction(data);
  if (!result.success) {
    const code = (result.error?.code ?? "GEN_003") as ErrorCode;
    throw new AppError(code, result.error?.message);
  }
  return result.data;
}

export async function listBookableAssets() {
  await requireSessionUser();
  return new BookingRepository().listBookableAssets();
}

export async function listUpcomingDepartmentBookings(departmentId: string) {
  await requireSessionUser();
  return new BookingRepository().findUpcomingByDepartment(departmentId);
}

export async function listMyBookings() {
  const user = await requireSessionUser();
  return new BookingRepository().findByBooker(user.id);
}
