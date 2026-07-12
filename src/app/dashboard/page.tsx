import Link from "next/link";
import { RecentActivityFeed } from "@/components/RecentActivityFeed";
import { listRecentActivity } from "@/modules/activity/queries/activity.queries";
import { getEmployeeDashboard } from "@/modules/reporting/queries/employee-dashboard.query";
import { getDepartmentDashboard } from "@/modules/reporting/queries/dashboard.query";
import { assertRole, requireSessionUser } from "@/shared/auth/session";
import { formatDate, formatDateTime } from "@/shared/format/date";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const user = await requireSessionUser();

  if (user.role === "EMPLOYEE") {
    const [dashboard, recentActivity] = await Promise.all([
      getEmployeeDashboard(),
      listRecentActivity(10),
    ]);

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
            <Link href="/activity">Activity</Link>
          </nav>
        </header>

        <section className="grid metrics" aria-label="Employee metrics">
          <Metric label="Active allocations" value={dashboard.allocations.length} />
          <Metric label="Upcoming bookings" value={dashboard.bookings.length} />
          <Metric label="Maintenance requests" value={dashboard.maintenanceRequests.length} />
          <Metric label="Transfer requests" value={dashboard.transferRequests.length} />
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <h2 className="card-title">Quick actions</h2>
          <nav className="nav-row">
            <Link className="button secondary" href="/allocation/my">
              My allocations
            </Link>
            <Link className="button secondary" href="/booking">
              Book resource
            </Link>
            <Link className="button secondary" href="/maintenance">
              Raise maintenance
            </Link>
            <Link className="button secondary" href="/notifications">
              Notifications
            </Link>
          </nav>
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
                meta={`${formatDateTime(booking.startTime)} - ${formatDateTime(booking.endTime)}`}
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

        <section className="card" style={{ marginTop: 24 }}>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              Recent activity
            </h2>
            <Link href="/activity">View all</Link>
          </div>
          <RecentActivityFeed
            emptyLabel="Your bookings, allocations, and requests will appear here."
            items={recentActivity}
          />
        </section>
      </main>
    );
  }

  if (user.role === "ASSET_MANAGER" || user.role === "ADMIN") {
    const [
      totalAssets,
      availableAssets,
      allocatedAssets,
      underMaintenance,
      pendingTransfers,
      pendingMaintenance,
      pendingAudits,
      recentActivities,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: "AVAILABLE" } }),
      prisma.asset.count({ where: { status: "ALLOCATED" } }),
      prisma.asset.count({ where: { status: "UNDER_MAINTENANCE" } }),
      prisma.transferRequest.count({ where: { status: "REQUESTED" } }),
      prisma.maintenanceRequest.count({ where: { status: "PENDING" } }),
      prisma.auditCycle.count({ where: { status: "OPEN" } }),
      prisma.activityLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true } } },
      }),
    ]);

    return (
      <main className="app-shell">
        <header className="page-header">
          <div>
            <p className="eyebrow">Operations workspace</p>
            <h1 className="page-title">Operations Dashboard</h1>
            <p className="page-subtitle">Global status of assets and compliance cycles.</p>
          </div>
          <nav className="nav-row">
            <Link href="/assets">Assets</Link>
            <Link href="/allocation">Allocations</Link>
            <Link href="/maintenance">Maintenance</Link>
            <Link href="/audit">Audits</Link>
          </nav>
        </header>

        <section className="grid metrics" aria-label="Manager metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <Metric label="Total Assets" value={totalAssets} />
          <Metric label="Available Assets" value={availableAssets} />
          <Metric label="Allocated Assets" value={allocatedAssets} />
          <Metric label="Under Maintenance" value={underMaintenance} />
          <Metric label="Pending Transfers" value={pendingTransfers} />
          <Metric label="Pending Maintenance" value={pendingMaintenance} />
          <Metric label="Pending Audits" value={pendingAudits} />
        </section>

        <section className="card" style={{ marginTop: 18 }}>
          <h2 className="card-title">Quick actions</h2>
          <nav className="nav-row">
            <Link className="button secondary" href="/assets/new">
              Register asset
            </Link>
            <Link className="button secondary" href="/allocation">
              Allocate asset
            </Link>
            <Link className="button secondary" href="/maintenance/queue">
              Maintenance queue
            </Link>
            <Link className="button secondary" href="/audit">
              Audit cycles
            </Link>
            <Link className="button secondary" href="/reports">
              Reports
            </Link>
          </nav>
        </section>

        <section className="card" style={{ marginTop: 24 }}>
          <h2 className="card-title">Recent Activity Log</h2>
          <div className="list">
            {recentActivities.map((log) => {
              const newVal = log.newValue as Record<string, unknown> | null;
              const title = newVal && typeof newVal === "object" && "description" in newVal
                ? String(newVal.description)
                : `${log.action.replace(/_/g, " ")} (${log.entityType})`;
              return (
                <ListItem
                  key={log.id}
                  title={title}
                  meta={`Performed by ${log.actor?.name ?? "System"} on ${formatDateTime(log.createdAt)}`}
                />
              );
            })}
            {recentActivities.length === 0 && <Empty />}
          </div>
        </section>
      </main>
    );
  }

  assertRole(user, "DEPARTMENT_HEAD");

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
        <Metric
          label="Overdue returns"
          value={dashboard.metrics.overdueAllocationCount}
          highlight={dashboard.metrics.overdueAllocationCount > 0}
        />
        <Metric label="Pending transfers" value={dashboard.metrics.pendingTransferCount} />
        <Metric label="Upcoming bookings" value={dashboard.metrics.upcomingBookingCount} />
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Quick actions</h2>
        <nav className="nav-row">
          <Link className="button secondary" href="/allocation/approvals">
            Transfer approvals
          </Link>
          <Link className="button secondary" href="/booking/department">
            Book resource
          </Link>
          <Link className="button secondary" href="/reports">
            Reports
          </Link>
          <Link className="button secondary" href="/maintenance/queue">
            Maintenance queue
          </Link>
        </nav>
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
                  ? `Due ${formatDate(allocation.expectedReturnDate)}`
                  : "Due date missing"
              }
            />
          ))}
          {dashboard.overdueAllocations.length === 0 && <Empty />}
        </Panel>
      </section>

      <section className="card" style={{ marginTop: 24 }}>
        <h2 className="card-title">Recent Activity Log</h2>
        <RecentActivityFeed items={dashboard.recentActivity} />
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="card" style={highlight ? { borderColor: "#cf222e" } : undefined}>
      <div className="muted">{label}</div>
      <strong className="metric-value" style={highlight ? { color: "#cf222e" } : undefined}>
        {value}
      </strong>
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
