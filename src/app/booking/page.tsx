import { BookingClient } from "./BookingClient";
import { listBookableAssets, listMyBookings } from "@/modules/booking/actions/booking.actions";
import {
  endOfWeek,
  listResourceBookingsInRange,
  startOfWeek,
} from "@/modules/booking/queries/booking.queries";
import { requireRole } from "@/lib/session";

export default async function EmployeeBookingPage() {
  await requireRole("EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");

  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(weekStart);

  const [assets, bookings, calendarBookings] = await Promise.all([
    listBookableAssets(),
    listMyBookings(),
    listResourceBookingsInRange(weekStart, weekEnd),
  ]);

  return (
    <BookingClient
      assets={assets}
      bookings={bookings}
      calendarBookings={calendarBookings}
    />
  );
}
