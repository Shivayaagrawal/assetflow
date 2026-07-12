import { getReportsOverview } from "@/features/dashboard/queries";

const page = {
  fontFamily: "system-ui, sans-serif",
  margin: "0 auto",
  maxWidth: "1120px",
  padding: "32px",
};

const card = {
  border: "1px solid #d8dee4",
  borderRadius: "8px",
  padding: "18px",
  background: "#fff",
};

export default async function ReportsPage() {
  const reports = await getReportsOverview();

  return (
    <main style={page}>
      <header style={{ marginBottom: "24px" }}>
        <p style={{ color: "#57606a", margin: 0 }}>Analytics</p>
        <h1 style={{ margin: "4px 0" }}>Reports Overview</h1>
      </header>

      <section style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
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
            <Row key={asset.id} label={`${asset.assetTag} · ${asset.name}`} value={asset.location} />
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
    <section style={card}>
      <h2 style={{ fontSize: "18px", marginTop: 0 }}>{title}</h2>
      <div style={{ display: "grid", gap: "10px" }}>{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        borderTop: "1px solid #d8dee4",
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        paddingTop: "10px",
      }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
