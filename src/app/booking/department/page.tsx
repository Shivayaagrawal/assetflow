import {
  listBookableAssets,
  listUpcomingDepartmentBookings,
} from "@/features/booking/queries";
import { requireRole } from "@/lib/session";
import { BookingClient } from "./BookingClient";

export default async function DepartmentBookingPage() {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const user = session.user as { departmentId?: string | null };

  if (!user.departmentId) {
    return (
      <main className="app-shell">
        <h1 className="page-title">Book Resource</h1>
        <p className="page-subtitle">
          Your account needs a department before department bookings can be made.
        </p>
      </main>
    );
  }

  const [assets, bookings] = await Promise.all([
    listBookableAssets(),
    listUpcomingDepartmentBookings(user.departmentId),
  ]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Department booking</p>
          <h1 className="page-title">Book Shared Resource</h1>
          <p className="page-subtitle">Reserve rooms and shared assets for your department.</p>
        </div>
      </header>

      <BookingClient
        assets={assets}
        bookings={bookings}
        departmentId={user.departmentId}
      />
    </main>
  );
}
