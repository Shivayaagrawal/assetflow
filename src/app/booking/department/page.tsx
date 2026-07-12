import { revalidatePath } from "next/cache";
import { bookResourceForDepartment } from "@/features/booking/actions";
import {
  listBookableAssets,
  listUpcomingDepartmentBookings,
} from "@/features/booking/queries";
import { requireRole } from "@/lib/session";

async function createDepartmentBooking(formData: FormData) {
  "use server";

  await bookResourceForDepartment({
    assetId: String(formData.get("assetId")),
    departmentId: String(formData.get("departmentId")),
    startTime: new Date(String(formData.get("startTime"))),
    endTime: new Date(String(formData.get("endTime"))),
  });

  revalidatePath("/booking/department");
  revalidatePath("/dashboard");
}

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

      <section className="grid two">
        <form action={createDepartmentBooking} className="card form-grid">
          <input type="hidden" name="departmentId" value={user.departmentId} />
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
          <h2 className="card-title">Upcoming Bookings</h2>
          <div className="list">
            {bookings.map((booking) => (
              <article className="list-item" key={booking.id}>
                <strong>
                  {booking.asset.assetTag} - {booking.asset.name}
                </strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {booking.startTime.toLocaleString()} - {booking.endTime.toLocaleString()}
                </p>
              </article>
            ))}
            {bookings.length === 0 && <p className="muted">No bookings yet.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
