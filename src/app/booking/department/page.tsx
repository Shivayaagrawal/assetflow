import { revalidatePath } from "next/cache";
import { bookResourceForDepartment } from "@/features/booking/actions";
import {
  listBookableAssets,
  listUpcomingDepartmentBookings,
} from "@/features/booking/queries";
import { requireRole } from "@/lib/session";

const page = {
  fontFamily: "system-ui, sans-serif",
  margin: "0 auto",
  maxWidth: "1080px",
  padding: "32px",
};

const card = {
  border: "1px solid #d8dee4",
  borderRadius: "8px",
  padding: "18px",
  background: "#fff",
};

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
      <main style={page}>
        <h1>Book Resource</h1>
        <p>Your account needs a department before department bookings can be made.</p>
      </main>
    );
  }

  const [assets, bookings] = await Promise.all([
    listBookableAssets(),
    listUpcomingDepartmentBookings(user.departmentId),
  ]);

  return (
    <main style={page}>
      <header style={{ marginBottom: "24px" }}>
        <p style={{ color: "#57606a", margin: 0 }}>Department booking</p>
        <h1 style={{ margin: "4px 0" }}>Book Shared Resource</h1>
      </header>

      <section
        style={{
          display: "grid",
          gap: "18px",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        }}
      >
        <form action={createDepartmentBooking} style={{ ...card, display: "grid", gap: "12px" }}>
          <input type="hidden" name="departmentId" value={user.departmentId} />
          <label>
            Resource
            <select name="assetId" required style={{ display: "block", width: "100%" }}>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} · {asset.name} · {asset.location}
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
          <button type="submit">Create booking</button>
        </form>

        <section style={card}>
          <h2 style={{ fontSize: "18px", marginTop: 0 }}>Upcoming Bookings</h2>
          <div style={{ display: "grid", gap: "12px" }}>
            {bookings.map((booking) => (
              <article key={booking.id} style={{ borderTop: "1px solid #d8dee4", paddingTop: "12px" }}>
                <strong>
                  {booking.asset.assetTag} · {booking.asset.name}
                </strong>
                <p style={{ color: "#57606a", margin: "4px 0 0" }}>
                  {booking.startTime.toLocaleString()} - {booking.endTime.toLocaleString()}
                </p>
              </article>
            ))}
            {bookings.length === 0 && <p style={{ color: "#57606a" }}>No bookings yet.</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
