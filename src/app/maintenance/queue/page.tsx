import { revalidatePath } from "next/cache";
import {
  approveMaintenance,
  assignTechnician,
  listMaintenanceKanban,
  rejectMaintenance,
  resolveMaintenance,
  startMaintenance,
} from "@/modules/maintenance/actions/maintenance.actions";
import { requireRole } from "@/lib/session";

async function approveRequest(formData: FormData) {
  "use server";
  await approveMaintenance({ requestId: String(formData.get("requestId")) });
  revalidatePath("/maintenance/queue");
  revalidatePath("/dashboard");
}

async function rejectRequest(formData: FormData) {
  "use server";
  await rejectMaintenance({
    requestId: String(formData.get("requestId")),
    reason: String(formData.get("reason") || "") || undefined,
  });
  revalidatePath("/maintenance/queue");
}

async function assignTech(formData: FormData) {
  "use server";
  await assignTechnician({
    requestId: String(formData.get("requestId")),
    technicianName: String(formData.get("technicianName")),
  });
  revalidatePath("/maintenance/queue");
}

async function startWork(formData: FormData) {
  "use server";
  await startMaintenance({ requestId: String(formData.get("requestId")) });
  revalidatePath("/maintenance/queue");
}

async function resolveRequest(formData: FormData) {
  "use server";
  await resolveMaintenance({ requestId: String(formData.get("requestId")) });
  revalidatePath("/maintenance/queue");
  revalidatePath("/dashboard");
}

const COLUMNS = [
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "TECHNICIAN_ASSIGNED", label: "Technician assigned" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
] as const;

export default async function MaintenanceQueuePage() {
  await requireRole("ASSET_MANAGER", "ADMIN", "DEPARTMENT_HEAD");
  const requests = await listMaintenanceKanban();

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Asset operations</p>
          <h1 className="page-title">Maintenance Kanban</h1>
          <p className="page-subtitle">
            Approve, assign technicians, and resolve maintenance requests.
          </p>
        </div>
      </header>

      <section className="grid" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {COLUMNS.map((column) => (
          <div className="card" key={column.key}>
            <h2 className="card-title">{column.label}</h2>
            <div className="list">
              {requests
                .filter((request) => request.status === column.key)
                .map((request) => (
                  <article className="list-item" key={request.id}>
                    <strong>
                      {request.asset.assetTag} — {request.asset.name}
                    </strong>
                    <p className="muted" style={{ margin: "4px 0" }}>
                      {request.priority} · Raised by {request.raisedBy.name}
                    </p>
                    <p style={{ margin: "0 0 8px" }}>{request.description}</p>

                    {request.status === "PENDING" && (
                      <div className="actions-row">
                        <form action={approveRequest}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <button type="submit">Approve</button>
                        </form>
                        <form action={rejectRequest} className="form-grid" style={{ gap: 6 }}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input name="reason" placeholder="Rejection reason" />
                          <button className="danger" type="submit">
                            Reject
                          </button>
                        </form>
                      </div>
                    )}

                    {request.status === "APPROVED" && (
                      <form action={assignTech} className="form-grid">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input
                          name="technicianName"
                          placeholder="Technician name"
                          required
                        />
                        <button type="submit">Assign</button>
                      </form>
                    )}

                    {request.status === "TECHNICIAN_ASSIGNED" && (
                      <form action={startWork}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <p className="muted">Tech: {request.technicianName}</p>
                        <button type="submit">Start work</button>
                      </form>
                    )}

                    {request.status === "IN_PROGRESS" && (
                      <form action={resolveRequest}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <button type="submit">Mark resolved</button>
                      </form>
                    )}
                  </article>
                ))}
              {requests.filter((request) => request.status === column.key).length === 0 && (
                <p className="muted">No items</p>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
