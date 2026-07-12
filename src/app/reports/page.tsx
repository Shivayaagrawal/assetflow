import Link from "next/link";
import { AccessDenied } from "@/components/AccessDenied";
import { getReportsOverview } from "@/modules/reporting/queries/dashboard.query";
import { requireSessionUser } from "@/shared/auth/session";
import { AuthorizationError } from "@/shared/errors/app-error";
import { prisma } from "@/lib/db";

function getMonthlyTrend(dates: Date[]) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const now = new Date();

  const trendMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return {
      label: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      month: d.getMonth(),
      year: d.getFullYear(),
      count: 0,
    };
  });

  dates.forEach((date) => {
    const d = new Date(date);
    const match = trendMonths.find(
      (m) => m.month === d.getMonth() && m.year === d.getFullYear()
    );
    if (match) {
      match.count++;
    }
  });

  return trendMonths;
}

function getLinePoints(trend: { count: number }[]) {
  const max = Math.max(...trend.map((t) => t.count), 1);
  return trend
    .map((t, i) => {
      const x = i * 20;
      const y = 30 - (t.count / max) * 26 - 2;
      return `${x},${y}`;
    })
    .join(" ");
}

export default async function ReportsPage() {
  const user = await requireSessionUser();

  if (user.role === "EMPLOYEE") {
    return (
      <AccessDenied
        message="Reports are available to department heads, asset managers, and administrators."
        title="Reports Overview"
      />
    );
  }

  if (user.role === "DEPARTMENT_HEAD" && !user.departmentId) {
    return (
      <AccessDenied
        message="Your account is not assigned to a department. Ask an administrator to assign you in Organization Setup."
        title="Reports Overview"
      />
    );
  }

  let reports;
  try {
    reports = await getReportsOverview();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return (
        <AccessDenied
          message="You do not have permission to view reports for this scope."
          title="Reports Overview"
        />
      );
    }
    throw error;
  }

  const [categories, departments, allocations, maintenances, audits] = await Promise.all([
    prisma.assetCategory.findMany({
      select: {
        name: true,
        _count: { select: { assets: true } },
      },
    }),
    prisma.department.findMany({
      select: {
        name: true,
        _count: { select: { assets: true } },
      },
    }),
    prisma.allocation.findMany({ select: { allocatedAt: true } }),
    prisma.maintenanceRequest.findMany({ select: { createdAt: true } }),
    prisma.auditCycle.findMany({ select: { startDate: true } }),
  ]);

  const allocationTrend = getMonthlyTrend(allocations.map((a) => a.allocatedAt));
  const maintenanceTrend = getMonthlyTrend(maintenances.map((m) => m.createdAt));
  const auditTrend = getMonthlyTrend(audits.map((a) => a.startDate));

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1 className="page-title">Reports Overview</h1>
          <p className="page-subtitle">Operational signals for utilization and follow-up.</p>
        </div>
        <Link className="button" href="/reports/export">
          Export report
        </Link>
      </header>

      <section className="grid three">
        <ReportCard title="Utilization by department">
          {reports.utilizationByDepartment.length === 0 ? (
            <EmptyState message="No active allocations yet." />
          ) : (
            reports.utilizationByDepartment.map((item) => (
              <Row
                key={item.departmentId ?? "unassigned"}
                label={item.departmentName}
                value={item.count}
              />
            ))
          )}
        </ReportCard>

        <ReportCard title="Most used assets">
          {reports.mostUsedAssets.length === 0 ? (
            <EmptyState message="No allocation history yet." />
          ) : (
            reports.mostUsedAssets.map((item) => (
              <Row key={item.assetId} label={item.assetName} value={item.count} />
            ))
          )}
        </ReportCard>

        <ReportCard title="Idle assets">
          {reports.idleAssets.length === 0 ? (
            <EmptyState message="No idle assets in scope." />
          ) : (
            reports.idleAssets.map((asset) => (
              <Row
                key={asset.id}
                label={`${asset.assetTag} - ${asset.name}`}
                value={asset.location ?? "Unknown"}
              />
            ))
          )}
        </ReportCard>

        <ReportCard title="Maintenance Frequency">
          {reports.maintenanceFrequency.length === 0 ? (
            <EmptyState message="No maintenance requests yet." />
          ) : (
            reports.maintenanceFrequency.map((item) => (
              <Row key={item.assetId} label={item.assetName} value={item.count} />
            ))
          )}
        </ReportCard>

        <ReportCard title="Audit Verification Status">
          <Row label="Verified" value={reports.auditReport.verified} />
          <Row label="Missing" value={reports.auditReport.missing} />
          <Row label="Damaged" value={reports.auditReport.damaged} />
          <Row label="Pending verification" value={reports.auditReport.pending} />
        </ReportCard>
      </section>

      <h2 style={{ marginTop: 32, marginBottom: 16 }}>Visual Analytics</h2>
      <section className="grid two" style={{ gap: 24, marginBottom: 32 }}>
        <ReportCard title="Assets by Category">
          {categories.length === 0 ? (
            <EmptyState message="Create asset categories in Organization Setup first." />
          ) : (
            categories.map((c) => {
              const total = Math.max(...categories.map((x) => x._count.assets), 1);
              const pct = (c._count.assets / total) * 100;
              return (
                <div key={c.name} className="list-item" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{c.name}</span>
                    <strong>{c._count.assets}</strong>
                  </div>
                  <div style={{ width: "100%", height: 8, backgroundColor: "#f6f8fa", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#0969da", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })
          )}
        </ReportCard>

        <ReportCard title="Assets by Department">
          {departments.length === 0 ? (
            <EmptyState message="Create departments in Organization Setup first." />
          ) : (
            departments.map((d) => {
              const total = Math.max(...departments.map((x) => x._count.assets), 1);
              const pct = (d._count.assets / total) * 100;
              return (
                <div key={d.name} className="list-item" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{d.name}</span>
                    <strong>{d._count.assets}</strong>
                  </div>
                  <div style={{ width: "100%", height: 8, backgroundColor: "#f6f8fa", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: "#2da44e", borderRadius: 4 }} />
                  </div>
                </div>
              );
            })
          )}
        </ReportCard>

        <ReportCard title="Allocation Trend (6 Months)">
          <TrendLine emptyMessage="No allocations in the last six months." trend={allocationTrend} color="#0969da" />
        </ReportCard>

        <ReportCard title="Maintenance Trend (6 Months)">
          <TrendLine emptyMessage="No maintenance activity in the last six months." trend={maintenanceTrend} color="#cf222e" />
        </ReportCard>

        <ReportCard title="Audit Trend (6 Months)">
          <TrendLine emptyMessage="No audit cycles in the last six months." trend={auditTrend} color="#8a6b10" />
        </ReportCard>
      </section>
    </main>
  );
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      <div className="list">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="list-item" style={{ display: "flex", gap: 12, justifyContent: "space-between" }}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="muted" style={{ margin: 0 }}>{message}</p>;
}

function TrendLine({
  trend,
  color,
  emptyMessage,
}: {
  trend: { label: string; count: number }[];
  color: string;
  emptyMessage: string;
}) {
  const hasData = trend.some((point) => point.count > 0);
  if (!hasData) {
    return <EmptyState message={emptyMessage} />;
  }

  const points = getLinePoints(trend);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <svg viewBox="0 0 100 30" width="100%" height="80" style={{ overflow: "visible" }}>
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#57606a" }}>
        {trend.map((t) => (
          <span key={t.label}>{t.label} ({t.count})</span>
        ))}
      </div>
    </div>
  );
}
