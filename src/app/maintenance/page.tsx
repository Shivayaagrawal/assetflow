import { revalidatePath } from "next/cache";
import { formatDate } from "@/shared/format/date";
import Link from "next/link";
import { MaintenancePriority, MaintenanceStatus } from "@prisma/client";
import {
  raiseMaintenanceRequest,
  assignTechnician,
  startMaintenance,
  resolveMaintenance,
  rejectMaintenance,
} from "@/modules/maintenance/actions/maintenance.actions";
import { listMyAllocations } from "@/modules/allocation/actions/transfer.actions";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";

// Server Actions
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

async function assignTechnicianAction(formData: FormData) {
  "use server";

  await assignTechnician({
    requestId: String(formData.get("requestId")),
    technicianName: String(formData.get("technicianName")),
  });

  revalidatePath("/maintenance");
}

async function startMaintenanceAction(formData: FormData) {
  "use server";

  await startMaintenance({
    requestId: String(formData.get("requestId")),
  });

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
}

async function completeMaintenanceAction(formData: FormData) {
  "use server";

  await resolveMaintenance({
    requestId: String(formData.get("requestId")),
  });

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
}

async function rejectMaintenanceAction(formData: FormData) {
  "use server";

  await rejectMaintenance({
    requestId: String(formData.get("requestId")),
    reason: String(formData.get("reason") ?? ""),
  });

  revalidatePath("/maintenance");
}

export default async function MaintenancePage() {
  const session = await requireRole("EMPLOYEE", "ASSET_MANAGER", "ADMIN");
  const user = session.user;
  const isManager = user.role === "ASSET_MANAGER" || user.role === "ADMIN";

  // Employee-specific details
  const allocations = !isManager ? await listMyAllocations() : [];
  const activeAssets = allocations.filter((allocation) => allocation.status === "ACTIVE");
  const employeeRequests = !isManager
    ? await prisma.maintenanceRequest.findMany({
        where: { raisedById: user.id },
        include: {
          asset: { select: { assetTag: true, name: true, location: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  // Manager-specific details
  const eligibleAssets = isManager
    ? await prisma.asset.findMany({
        where: {
          status: { in: ["AVAILABLE", "ALLOCATED"] },
        },
        orderBy: { assetTag: "asc" },
      })
    : [];

  const allRequests = isManager
    ? await prisma.maintenanceRequest.findMany({
        include: {
          asset: { select: { id: true, assetTag: true, name: true, status: true, location: true } },
          raisedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const pendingRequests = allRequests.filter(
    (r) =>
      r.status === MaintenanceStatus.PENDING ||
      r.status === MaintenanceStatus.APPROVED ||
      r.status === MaintenanceStatus.TECHNICIAN_ASSIGNED
  );

  const inProgressRequests = allRequests.filter(
    (r) => r.status === MaintenanceStatus.IN_PROGRESS
  );

  const completedRequests = allRequests.filter(
    (r) =>
      r.status === MaintenanceStatus.RESOLVED ||
      r.status === MaintenanceStatus.REJECTED
  );

  if (!isManager) {
    // Teammate's original Employee interface
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

        {employeeRequests.length > 0 && (
          <section className="card" style={{ marginTop: 24 }}>
            <h2 className="card-title">Your Maintenance Requests</h2>
            <div className="list">
              {employeeRequests.map((req) => (
                <article className="list-item" key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{req.asset.assetTag} - {req.asset.name}</strong>
                    <p className="muted" style={{ margin: "4px 0 0" }}>{req.description}</p>
                  </div>
                  <span className="status-pill">{req.status}</span>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // Asset Manager dashboard view
  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Operations Management</p>
          <h1 className="page-title">Asset Maintenance</h1>
          <p className="page-subtitle">
            Report issues, assign technicians, and track maintenance operations.
          </p>
        </div>
      </header>

      <section className="grid two" style={{ marginBottom: 18 }}>
        <form action={submitMaintenance} className="card form-grid">
          <h2 className="card-title span-full">Raise Maintenance Request</h2>
          
          <label className="span-full">
            Asset
            <select disabled={eligibleAssets.length === 0} name="assetId" required>
              <option value="">Select asset</option>
              {eligibleAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetTag} - {asset.name} ({asset.status})
                </option>
              ))}
            </select>
          </label>

          <label className="span-full">
            Description
            <input name="description" required placeholder="Describe the issue" />
          </label>

          <label className="span-full">
            Priority
            <select name="priority" required defaultValue={MaintenancePriority.MEDIUM}>
              <option value={MaintenancePriority.LOW}>Low</option>
              <option value={MaintenancePriority.MEDIUM}>Medium</option>
              <option value={MaintenancePriority.HIGH}>High</option>
              <option value={MaintenancePriority.CRITICAL}>Critical</option>
            </select>
          </label>

          <button
            className="span-full"
            disabled={eligibleAssets.length === 0}
            type="submit"
          >
            Submit Request
          </button>

          {eligibleAssets.length === 0 ? (
            <p className="muted span-full" style={{ margin: 0 }}>
              No available or allocated assets can be placed in maintenance right now.
            </p>
          ) : null}
        </form>

        <section className="card">
          <h2 className="card-title">Maintenance Guidelines</h2>
          <div className="list">
            <p className="muted" style={{ margin: 0 }}>
              Only assets with status <strong>AVAILABLE</strong> or <strong>ALLOCATED</strong> can be put in maintenance.
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Starting maintenance on an allocated asset will automatically return it and terminate its active allocation.
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Completing maintenance returns the asset status back to <strong>AVAILABLE</strong>.
            </p>
          </div>
        </section>
      </section>

      <section className="grid" style={{ gap: 24 }}>
        {/* Pending Requests */}
        <section className="card" style={{ padding: 18 }}>
          <h2 className="card-title" style={{ borderBottom: "1px solid #d0d7de", paddingBottom: 10 }}>
            Pending Requests ({pendingRequests.length})
          </h2>
          {pendingRequests.length === 0 ? (
            <p className="muted" style={{ margin: "10px 0 0" }}>No pending requests.</p>
          ) : (
            <div className="list" style={{ marginTop: 10 }}>
              {pendingRequests.map((req) => (
                <article key={req.id} className="list-item" style={{ borderBottom: "1px solid #f6f8fa", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong>{req.asset.assetTag} - {req.asset.name}</strong>
                      <span className="status-pill" style={{ marginLeft: 8 }}>{req.status}</span>
                      <span className="status-pill" style={{ marginLeft: 4, backgroundColor: "#fff8c5", color: "#8a6b10" }}>
                        {req.priority}
                      </span>
                      <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{req.description}</p>
                      <small className="muted" style={{ display: "block", marginTop: 6 }}>
                        Raised by {req.raisedBy.name} on {formatDate(req.createdAt)}
                      </small>
                      {req.technicianName && (
                        <p style={{ margin: "6px 0 0", color: "#0969da" }}>
                          Technician: <strong>{req.technicianName}</strong>
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                      {req.status !== MaintenanceStatus.TECHNICIAN_ASSIGNED ? (
                        <>
                          <form action={assignTechnicianAction} className="form-grid" style={{ gap: 6, display: "flex", flexDirection: "column" }}>
                            <input type="hidden" name="requestId" value={req.id} />
                            <input
                              required
                              name="technicianName"
                              placeholder="Technician name"
                              style={{ padding: "4px 8px", fontSize: 12 }}
                            />
                            <button className="secondary" type="submit" style={{ padding: "4px 8px", fontSize: 12 }}>
                              Assign
                            </button>
                          </form>
                          <form action={rejectMaintenanceAction}>
                            <input type="hidden" name="requestId" value={req.id} />
                            <button className="danger" type="submit" style={{ padding: "6px 12px", fontSize: 12 }}>
                              Reject
                            </button>
                          </form>
                        </>
                      ) : (
                        <form action={startMaintenanceAction}>
                          <input type="hidden" name="requestId" value={req.id} />
                          <button type="submit" style={{ padding: "6px 12px", fontSize: 12 }}>
                            Start Maintenance
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* In Progress */}
        <section className="card" style={{ padding: 18 }}>
          <h2 className="card-title" style={{ borderBottom: "1px solid #d0d7de", paddingBottom: 10 }}>
            In Progress ({inProgressRequests.length})
          </h2>
          {inProgressRequests.length === 0 ? (
            <p className="muted" style={{ margin: "10px 0 0" }}>No maintenance currently in progress.</p>
          ) : (
            <div className="list" style={{ marginTop: 10 }}>
              {inProgressRequests.map((req) => (
                <article key={req.id} className="list-item" style={{ borderBottom: "1px solid #f6f8fa", paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong>{req.asset.assetTag} - {req.asset.name}</strong>
                      <span className="status-pill" style={{ marginLeft: 8, backgroundColor: "#ddf4ff", color: "#0969da" }}>
                        In Progress
                      </span>
                      <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{req.description}</p>
                      {req.technicianName && (
                        <p style={{ margin: "6px 0 0" }}>
                          Technician: <strong>{req.technicianName}</strong>
                        </p>
                      )}
                    </div>
                    <form action={completeMaintenanceAction}>
                      <input type="hidden" name="requestId" value={req.id} />
                      <button type="submit" className="secondary" style={{ padding: "6px 12px", fontSize: 12 }}>
                        Complete Maintenance
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Completed */}
        <section className="card" style={{ padding: 18 }}>
          <h2 className="card-title" style={{ borderBottom: "1px solid #d0d7de", paddingBottom: 10 }}>
            Archived / Completed ({completedRequests.length})
          </h2>
          {completedRequests.length === 0 ? (
            <p className="muted" style={{ margin: "10px 0 0" }}>No completed logs.</p>
          ) : (
            <div className="list" style={{ marginTop: 10 }}>
              {completedRequests.map((req) => (
                <article key={req.id} className="list-item" style={{ borderBottom: "1px solid #f6f8fa", paddingBottom: 12, marginBottom: 12 }}>
                  <strong>{req.asset.assetTag} - {req.asset.name}</strong>
                  <span className="status-pill" style={{ marginLeft: 8, backgroundColor: "#dafbe1", color: "#1f883d" }}>
                    {req.status}
                  </span>
                  <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{req.description}</p>
                  {req.technicianName && (
                    <small className="muted" style={{ display: "block", marginTop: 4 }}>
                      Technician: {req.technicianName}
                    </small>
                  )}
                  {req.resolvedAt && (
                    <small className="muted" style={{ display: "block" }}>
                      Resolved at {formatDate(req.resolvedAt)}
                    </small>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
