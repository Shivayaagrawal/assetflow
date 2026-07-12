import { getReportsOverview } from "@/features/dashboard/queries";

export default async function ReportsPage() {
  const reports = await getReportsOverview();

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1 className="page-title">Reports Overview</h1>
          <p className="page-subtitle">Operational signals for utilization and follow-up.</p>
        </div>
        <button type="button">Export report</button>
      </header>

      <section className="grid three">
        <ReportCard title="Utilization by department">
          {reports.utilizationByDepartment.map((item) => (
            <Row
              key={item.departmentId ?? "unassigned"}
              label={item.departmentId ?? "Unassigned"}
              value={item._count.id}
            />
          ))}
        </ReportCard>

        <ReportCard title="Most used assets">
          {reports.mostUsedAssets.map((item) => (
            <Row key={item.assetId} label={item.assetId} value={item._count.id} />
          ))}
        </ReportCard>

        <ReportCard title="Idle assets">
          {reports.idleAssets.map((asset) => (
            <Row key={asset.id} label={`${asset.assetTag} - ${asset.name}`} value={asset.location} />
          ))}
        </ReportCard>

        <ReportCard title="Maintenance Frequency">
          {reports.maintenanceFrequency.map((item) => (
            <Row key={item.assetId} label={item.assetId} value={item._count.id} />
          ))}
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
