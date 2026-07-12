import Link from "next/link";
import { getDepartmentDashboard } from "@/features/dashboard/queries";
import { requireRole } from "@/lib/session";

const page = {
  fontFamily: "system-ui, sans-serif",
  margin: "0 auto",
  maxWidth: "1180px",
  padding: "32px",
};

const grid = {
  display: "grid",
  gap: "16px",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const card = {
  border: "1px solid #d8dee4",
  borderRadius: "8px",
  padding: "18px",
  background: "#fff",
};

export default async function DashboardPage() {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const user = session.user as { role?: string; departmentId?: string | null };

  if (!user.departmentId && user.role === "DEPARTMENT_HEAD") {
    return (
      <main style={page}>
        <h1>Department Dashboard</h1>
        <p>Your account is not assigned to a department yet.</p>
      </main>
    );
  }

  const departmentId = user.departmentId;

  if (!departmentId) {
    return (
      <main style={page}>
        <h1>Department Dashboard</h1>
        <p>Select a department from Organization Setup to view scoped data.</p>
      </main>
    );
  }

  const dashboard = await getDepartmentDashboard(departmentId);

  return (
    <main style={page}>
      <header style={{ marginBottom: "28px" }}>
        <p style={{ color: "#57606a", margin: 0 }}>Department workspace</p>
        <h1 style={{ margin: "4px 0" }}>{dashboard.department.name}</h1>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href="/allocation/approvals">Approvals</Link>
          <Link href="/booking/department">Book resource</Link>
          <Link href="/reports">Reports</Link>
        </nav>
      </header>

      <section style={grid} aria-label="Department metrics">
        <Metric label="Active allocations" value={dashboard.metrics.activeAllocationCount} />
        <Metric label="Overdue returns" value={dashboard.metrics.overdueAllocationCount} />
        <Metric label="Pending transfers" value={dashboard.metrics.pendingTransferCount} />
        <Metric label="Upcoming bookings" value={dashboard.metrics.upcomingBookingCount} />
      </section>

      <section style={{ ...grid, marginTop: "24px", alignItems: "start" }}>
        <Panel title="Active Allocations">
          {dashboard.activeAllocations.map((allocation) => (
            <ListItem
              key={allocation.id}
              title={`${allocation.asset.assetTag} · ${allocation.asset.name}`}
              meta={`${allocation.asset.location} · ${allocation.asset.status}`}
            />
          ))}
          {dashboard.activeAllocations.length === 0 && <Empty />}
        </Panel>

        <Panel title="Pending Transfers">
          {dashboard.pendingTransfers.map((transfer) => (
            <ListItem
              key={transfer.id}
              title={`${transfer.asset.assetTag} · ${transfer.asset.name}`}
              meta={`Requested by ${transfer.requestedBy.name}`}
            />
          ))}
          {dashboard.pendingTransfers.length === 0 && <Empty />}
        </Panel>

        <Panel title="Overdue Returns">
          {dashboard.overdueAllocations.map((allocation) => (
            <ListItem
              key={allocation.id}
              title={`${allocation.asset.assetTag} · ${allocation.asset.name}`}
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
    <div style={card}>
      <div style={{ color: "#57606a", fontSize: "14px" }}>{label}</div>
      <strong style={{ display: "block", fontSize: "32px", marginTop: "8px" }}>
        {value}
      </strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={card}>
      <h2 style={{ fontSize: "18px", marginTop: 0 }}>{title}</h2>
      <div style={{ display: "grid", gap: "12px" }}>{children}</div>
    </section>
  );
}

function ListItem({ title, meta }: { title: string; meta: string }) {
  return (
    <article style={{ borderTop: "1px solid #d8dee4", paddingTop: "12px" }}>
      <strong>{title}</strong>
      <p style={{ color: "#57606a", margin: "4px 0 0" }}>{meta}</p>
    </article>
  );
}

function Empty() {
  return <p style={{ color: "#57606a" }}>No records right now.</p>;
}
