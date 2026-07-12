import Link from "next/link";
import { getDepartmentDashboard } from "@/features/dashboard/queries";
import { requireRole } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const user = session.user as { role?: string; departmentId?: string | null };

  if (!user.departmentId && user.role === "DEPARTMENT_HEAD") {
    return (
      <main className="app-shell">
        <h1 className="page-title">Department Dashboard</h1>
        <p className="page-subtitle">Your account is not assigned to a department yet.</p>
      </main>
    );
  }

  if (!user.departmentId) {
    return (
      <main className="app-shell">
        <h1 className="page-title">Department Dashboard</h1>
        <p className="page-subtitle">Select a department from Organization Setup.</p>
      </main>
    );
  }

  const dashboard = await getDepartmentDashboard(user.departmentId);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Department workspace</p>
          <h1 className="page-title">{dashboard.department.name}</h1>
          <p className="page-subtitle">
            {dashboard.department._count.members} active members in scope
          </p>
        </div>
        <nav className="nav-row">
          <Link href="/allocation/approvals">Approvals</Link>
          <Link href="/booking/department">Book resource</Link>
          <Link href="/reports">Reports</Link>
        </nav>
      </header>

      <section className="grid metrics" aria-label="Department metrics">
        <Metric label="Active allocations" value={dashboard.metrics.activeAllocationCount} />
        <Metric label="Overdue returns" value={dashboard.metrics.overdueAllocationCount} />
        <Metric label="Pending transfers" value={dashboard.metrics.pendingTransferCount} />
        <Metric label="Upcoming bookings" value={dashboard.metrics.upcomingBookingCount} />
      </section>

      <section className="grid three" style={{ marginTop: 24 }}>
        <Panel title="Active Allocations">
          {dashboard.activeAllocations.map((allocation) => (
            <ListItem
              key={allocation.id}
              title={`${allocation.asset.assetTag} - ${allocation.asset.name}`}
              meta={`${allocation.asset.location} - ${allocation.asset.status}`}
            />
          ))}
          {dashboard.activeAllocations.length === 0 && <Empty />}
        </Panel>

        <Panel title="Pending Transfers">
          {dashboard.pendingTransfers.map((transfer) => (
            <ListItem
              key={transfer.id}
              title={`${transfer.allocation.asset.assetTag} - ${transfer.allocation.asset.name}`}
              meta={`Requested by ${transfer.fromEmployee.name}`}
            />
          ))}
          {dashboard.pendingTransfers.length === 0 && <Empty />}
        </Panel>

        <Panel title="Overdue Returns">
          {dashboard.overdueAllocations.map((allocation) => (
            <ListItem
              key={allocation.id}
              title={`${allocation.asset.assetTag} - ${allocation.asset.name}`}
              meta={
                allocation.expectedReturnDate
                  ? `Due ${allocation.expectedReturnDate.toLocaleDateString()}`
                  : "Due date missing"
              }
            />
          ))}
          {dashboard.overdueAllocations.length === 0 && <Empty />}
        </Panel>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      <div className="list">{children}</div>
    </section>
  );
}

function ListItem({ title, meta }: { title: string; meta: string }) {
  return (
    <article className="list-item">
      <strong>{title}</strong>
      <p className="muted" style={{ margin: "4px 0 0" }}>
        {meta}
      </p>
    </article>
  );
}

function Empty() {
  return <p className="muted">No records right now.</p>;
}
