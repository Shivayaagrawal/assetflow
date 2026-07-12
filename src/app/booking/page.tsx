import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  cancelBooking,
  createEmployeeBooking,
  listBookableAssets,
  listMyBookings,
} from "@/modules/booking/actions/booking.actions";
import { requireRole } from "@/lib/session";

async function submitBooking(formData: FormData) {
  "use server";

  await createEmployeeBooking({
    assetId: String(formData.get("assetId")),
    startTime: new Date(String(formData.get("startTime"))),
    endTime: new Date(String(formData.get("endTime"))),
  });

  revalidatePath("/booking");
  revalidatePath("/dashboard");
}

async function cancelMyBooking(formData: FormData) {
  "use server";

  await cancelBooking(String(formData.get("bookingId")));
  revalidatePath("/booking");
  revalidatePath("/dashboard");
}

export default async function EmployeeBookingPage() {
  await requireRole("EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");

  const [assets, bookings] = await Promise.all([
    listBookableAssets(),
    listMyBookings(),
  ]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Resource booking</p>
          <h1 className="page-title">Book Shared Resource</h1>
          <p className="page-subtitle">Reserve rooms and shared assets in non-overlapping slots.</p>
        </div>
        <nav className="nav-row">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/allocation/my">My allocations</Link>
        </nav>
      </header>

      <section className="grid two">
        <form action={submitBooking} className="card form-grid">
          <h2 className="card-title span-full">New booking</h2>
          <label className="span-full">
            Resource
            <select name="assetId" required>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} - {asset.name} - {asset.location}
                </option>
              ))}
            </select>
          </label>
          <label>
            Start
            <input name="startTime" required type="datetime-local" />
          </label>
          <label>
            End
            <input name="endTime" required type="datetime-local" />
          </label>
          <button className="span-full" type="submit">
            Create booking
          </button>
        </form>

        <section className="card">
          <h2 className="card-title">My bookings</h2>
          <div className="list">
            {bookings.map((booking) => (
              <article className="list-item" key={booking.id}>
                <strong>
                  {booking.asset.assetTag} - {booking.asset.name}
                </strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {booking.startTime.toLocaleString()} - {booking.endTime.toLocaleString()} (
                  {booking.status})
                </p>
                {booking.status === "UPCOMING" ? (
                  <form action={cancelMyBooking} style={{ marginTop: 8 }}>
                    <input name="bookingId" type="hidden" value={booking.id} />
                    <button className="secondary danger" type="submit">
                      Cancel
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
            {bookings.length === 0 && <p className="muted">No bookings yet.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
