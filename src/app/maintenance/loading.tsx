export default function MaintenanceLoading() {
  return (
    <main className="app-shell">
      <header className="page-header">
        <div style={{ width: "100%" }}>
          <div className="skeleton" style={{ width: "120px", height: "16px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "260px", height: "36px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "380px", height: "16px" }} />
        </div>
      </header>

      <section className="grid two" style={{ marginBottom: "24px" }}>
        <div className="card" style={{ height: "280px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="skeleton" style={{ width: "180px", height: "24px" }} />
          <div className="skeleton" style={{ width: "100%", height: "36px" }} />
          <div className="skeleton" style={{ width: "100%", height: "80px" }} />
          <div className="skeleton" style={{ width: "100%", height: "36px" }} />
        </div>
        <div className="card" style={{ height: "280px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="skeleton" style={{ width: "150px", height: "24px" }} />
          <div className="skeleton" style={{ width: "100%", height: "16px" }} />
          <div className="skeleton" style={{ width: "100%", height: "16px" }} />
        </div>
      </section>
    </main>
  );
}
