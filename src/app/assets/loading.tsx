export default function AssetsLoading() {
  return (
    <main className="app-shell">
      <header className="page-header">
        <div style={{ width: "100%" }}>
          <div className="skeleton" style={{ width: "120px", height: "16px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "240px", height: "36px", marginBottom: "8px" }} />
          <div className="skeleton" style={{ width: "350px", height: "16px" }} />
        </div>
      </header>

      <section className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="skeleton" style={{ width: "180px", height: "24px" }} />
        <div className="skeleton" style={{ width: "100%", height: "40px" }} />
        <div className="skeleton" style={{ width: "100%", height: "40px" }} />
        <div className="skeleton" style={{ width: "100%", height: "40px" }} />
        <div className="skeleton" style={{ width: "100%", height: "40px" }} />
      </section>
    </main>
  );
}
