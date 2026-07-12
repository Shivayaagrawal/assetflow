import Link from "next/link";
import { getEmployeeDashboard } from "@/modules/reporting/queries/employee-dashboard.query";
import { getDepartmentDashboard } from "@/modules/reporting/queries/dashboard.query";
import { assertRole, requireSessionUser } from "@/shared/auth/session";

export default async function DashboardPage() {
  const user = await requireSessionUser();

  if (user.role === "EMPLOYEE") {
    const dashboard = await getEmployeeDashboard();

    return (
      <main className="app-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Employee workspace</p>
            <h1 className="page-title">Welcome, {user.name}</h1>
            <p className="page-subtitle">Your allocations, bookings, and requests.</p>
          </div>
          <nav className="nav-row">
            <Link href="/allocation/my">My allocations</Link>
            <Link href="/booking">Book resource</Link>
            <Link href="/maintenance">Maintenance</Link>
          </nav>
        </header>

        <section className="grid metrics" aria-label="Employee metrics">
          <Metric label="Active allocations" value={dashboard.allocations.length} />
          <Metric label="Upcoming bookings" value={dashboard.bookings.length} />
          <Metric label="Maintenance requests" value={dashboard.maintenanceRequests.length} />
          <Metric label="Transfer requests" value={dashboard.transferRequests.length} />
        </section>

        <section className="grid three" style={{ marginTop: 24 }}>
          <Panel title="My Allocations">
            {dashboard.allocations.map((allocation) => (
              <ListItem
                key={allocation.id}
                title={`${allocation.asset.assetTag} - ${allocation.asset.name}`}
                meta={allocation.asset.location ?? "No location"}
              />
            ))}
            {dashboard.allocations.length === 0 && <Empty />}
          </Panel>

          <Panel title="Upcoming Bookings">
            {dashboard.bookings.map((booking) => (
              <ListItem
                key={booking.id}
                title={`${booking.asset.assetTag} - ${booking.asset.name}`}
                meta={`${booking.startTime.toLocaleString()} - ${booking.endTime.toLocaleString()}`}
              />
            ))}
            {dashboard.bookings.length === 0 && <Empty />}
          </Panel>

          <Panel title="Recent Requests">
            {dashboard.maintenanceRequests.map((request) => (
              <ListItem
                key={request.id}
                title={`Maintenance: ${request.asset.assetTag}`}
                meta={`${request.status} - ${request.priority}`}
              />
            ))}
            {dashboard.transferRequests.map((transfer) => (
              <ListItem
                key={transfer.id}
                title={`Transfer: ${transfer.allocation.asset.assetTag}`}
                meta={`${transfer.status} to ${transfer.toEmployee.name}`}
              />
            ))}
            {dashboard.maintenanceRequests.length === 0 &&
              dashboard.transferRequests.length === 0 && <Empty />}
          </Panel>
        </section>
      </main>
    );
  }

  assertRole(user, "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");

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

      <section className="card" style={{ marginTop: 24 }}>
        <h2 className="card-title">Recent Activity Log</h2>
        <div className="list">
          {dashboard.recentActivity.map((log) => {
            const newVal = log.newValue as Record<string, unknown> | null;
            const title = newVal && typeof newVal === "object" && "description" in newVal
              ? String(newVal.description)
              : `${log.action.replace(/_/g, " ")} (${log.entityType})`;
            return (
              <ListItem
                key={log.id}
                title={title}
                meta={`Performed by ${log.actor?.name ?? "System"} on ${log.createdAt.toLocaleString()}`}
              />
            );
          })}
          {dashboard.recentActivity.length === 0 && <Empty />}
        </div>
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
