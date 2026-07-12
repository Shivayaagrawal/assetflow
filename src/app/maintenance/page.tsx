import { revalidatePath } from "next/cache";
import Link from "next/link";
import { MaintenancePriority } from "@prisma/client";
import { raiseMaintenanceRequest } from "@/modules/maintenance/actions/maintenance.actions";
import { listMyAllocations } from "@/modules/allocation/actions/transfer.actions";
import { requireRole } from "@/lib/session";

async function submitMaintenance(formData: FormData) {
  "use server";

  await raiseMaintenanceRequest({
    assetId: String(formData.get("assetId")),
    description: String(formData.get("description")),
    priority: formData.get("priority") as MaintenancePriority,
  });

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
}

export default async function MaintenancePage() {
  await requireRole("EMPLOYEE");
  const allocations = await listMyAllocations();
  const activeAssets = allocations.filter((allocation) => allocation.status === "ACTIVE");

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Employee workspace</p>
          <h1 className="page-title">Raise Maintenance</h1>
          <p className="page-subtitle">Report issues for assets allocated to you.</p>
        </div>
        <nav className="nav-row">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/allocation/my">My allocations</Link>
        </nav>
      </header>

      <section className="grid two">
        <form action={submitMaintenance} className="card form-grid">
          <h2 className="card-title span-full">New request</h2>
          <label className="span-full">
            Asset
            <select name="assetId" required>
              {activeAssets.map((allocation) => (
                <option key={allocation.asset.id} value={allocation.asset.id}>
                  {allocation.asset.assetTag} - {allocation.asset.name}
                </option>
              ))}
            </select>
          </label>
          <label className="span-full">
            Priority
            <select name="priority" defaultValue="MEDIUM">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </label>
          <label className="span-full">
            Description
            <input name="description" required placeholder="Describe the issue" />
          </label>
          <button className="span-full" type="submit">
            Submit request
          </button>
        </form>

        <section className="card">
          <h2 className="card-title">Allocated assets</h2>
          <div className="list">
            {activeAssets.map((allocation) => (
              <article className="list-item" key={allocation.id}>
                <strong>
                  {allocation.asset.assetTag} - {allocation.asset.name}
                </strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  {allocation.asset.location ?? "No location"}
                </p>
              </article>
            ))}
            {activeAssets.length === 0 && (
              <p className="muted">You need an active allocation to raise maintenance.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
