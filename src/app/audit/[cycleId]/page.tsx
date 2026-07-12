import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuditCycle, listAuditCycles } from "@/modules/audit/actions/audit.actions";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/shared/format/date";
import { AuditVerifyPanel } from "../AuditVerifyPanel";
import { closeCycleAction } from "../audit-form-actions";

export const dynamic = "force-dynamic";

export default async function AuditCyclePage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const { user } = await requireRole(
    "ASSET_MANAGER",
    "ADMIN",
    "DEPARTMENT_HEAD",
    "EMPLOYEE"
  );

  let cycle;
  try {
    cycle = await getAuditCycle(cycleId);
  } catch {
    notFound();
  }

  const cycles = await listAuditCycles();
  const canManage = user.role === "ASSET_MANAGER" || user.role === "ADMIN";
  const isAssignedAuditor = cycle.auditors.some((row) => row.auditorId === user.id);
  const canVerify = cycle.status === "OPEN" && (canManage || isAssignedAuditor);
  const discrepancies = cycle.items.filter((item) =>
    ["MISSING", "DAMAGED"].includes(item.verificationStatus)
  );

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Compliance</p>
          <h1 className="page-title">{cycle.name}</h1>
          <p className="page-subtitle">
            {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)} ·{" "}
            {cycle.status} · {cycle.items.length} assets
          </p>
        </div>
        <nav className="nav-row">
          <Link className="button secondary" href="/audit">
            All cycles
          </Link>
          {canManage && cycle.status === "OPEN" && (
            <form action={closeCycleAction}>
              <input type="hidden" name="auditCycleId" value={cycle.id} />
              <button type="submit">Close cycle</button>
            </form>
          )}
        </nav>
      </header>

      {cycle.status === "CLOSED" && discrepancies.length > 0 && (
        <section className="card" style={{ marginBottom: 18, borderColor: "#cf222e" }}>
          <h2 className="card-title">Discrepancy report</h2>
          <p className="muted" style={{ margin: "0 0 12px" }}>
            {discrepancies.length} flagged item{discrepancies.length === 1 ? "" : "s"} from this
            cycle. Missing assets were marked Lost when the cycle closed.
          </p>
          <div className="list">
            {discrepancies.map((item) => (
              <article className="list-item discrepancy-row" key={item.id}>
                <strong>
                  {item.asset.assetTag} — {item.asset.name}
                </strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>
                  Status: {item.verificationStatus}
                  {item.expectedLocation ? ` · Location: ${item.expectedLocation}` : ""}
                  {item.verifiedBy ? ` · Verified by ${item.verifiedBy.name}` : ""}
                </p>
                {item.notes ? (
                  <p style={{ margin: "6px 0 0" }}>{item.notes}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      )}

      {cycles.length > 1 && cycle.status === "OPEN" && (
        <section className="card" style={{ marginBottom: 18 }}>
          <h2 className="card-title">Switch cycle</h2>
          <div className="nav-row">
            {cycles.map((openCycle) => (
              <Link
                className={openCycle.id === cycle.id ? "button" : "button secondary"}
                href={`/audit/${openCycle.id}`}
                key={openCycle.id}
              >
                {openCycle.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Assets in scope</h2>
        <div className="list">
          {cycle.items.map((item) => (
            <article className="list-item" key={item.id}>
              <strong>
                {item.asset.assetTag} — {item.asset.name}
              </strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Expected: {item.expectedLocation ?? "—"} · Status: {item.verificationStatus}
                {item.verifiedBy ? ` · by ${item.verifiedBy.name}` : ""}
              </p>
              {item.notes ? (
                <p style={{ margin: "6px 0 0" }}>Notes: {item.notes}</p>
              ) : null}

              {canVerify && item.verificationStatus === "PENDING" && (
                <AuditVerifyPanel
                  assetId={item.asset.id}
                  auditCycleId={cycle.id}
                  defaultExpectedLocation={item.expectedLocation}
                />
              )}
            </article>
          ))}
          {cycle.items.length === 0 && (
            <p className="muted" style={{ margin: 0 }}>
              No assets in this cycle.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
