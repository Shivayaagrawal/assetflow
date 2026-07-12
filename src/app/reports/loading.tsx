export default function ReportsLoading() {
  return (
    <main className="app-shell">
      <header className="page-header">
        <div style={{ width: "100%" }}>
          <div className="skeleton" style={{ width: "120px", height: "16px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "240px", height: "36px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "350px", height: "16px" }} />
        </div>
      </header>

      <section className="grid three">
        <div className="card" style={{ height: "200px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="skeleton" style={{ width: "140px", height: "20px" }} />
          <div className="skeleton" style={{ width: "100%", height: "14px" }} />
          <div className="skeleton" style={{ width: "100%", height: "14px" }} />
          <div className="skeleton" style={{ width: "100%", height: "14px" }} />
        </div>
        <div className="card" style={{ height: "200px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="skeleton" style={{ width: "140px", height: "20px" }} />
          <div className="skeleton" style={{ width: "100%", height: "14px" }} />
          <div className="skeleton" style={{ width: "100%", height: "14px" }} />
        </div>
        <div className="card" style={{ height: "200px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="skeleton" style={{ width: "140px", height: "20px" }} />
          <div className="skeleton" style={{ width: "100%", height: "14px" }} />
          <div className="skeleton" style={{ width: "100%", height: "14px" }} />
        </div>
      </section>
    </main>
  );
}
