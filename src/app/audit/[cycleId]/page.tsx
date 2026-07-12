import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuditCycle, listAuditCycles } from "@/modules/audit/actions/audit.actions";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/shared/format/date";
import { closeCycleAction, verifyItemAction } from "../audit-form-actions";

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

      {cycles.length > 1 && (
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
                Expected: {item.expectedLocation ?? "—"} · Status:{" "}
                {item.verificationStatus}
                {item.verifiedBy ? ` · by ${item.verifiedBy.name}` : ""}
              </p>

              {canVerify && item.verificationStatus === "PENDING" && (
                <div className="actions-row" style={{ marginTop: 10 }}>
                  <form action={verifyItemAction}>
                    <input type="hidden" name="auditCycleId" value={cycle.id} />
                    <input type="hidden" name="assetId" value={item.asset.id} />
                    <input type="hidden" name="verificationStatus" value="VERIFIED" />
                    <button type="submit">Verified</button>
                  </form>
                  <form action={verifyItemAction}>
                    <input type="hidden" name="auditCycleId" value={cycle.id} />
                    <input type="hidden" name="assetId" value={item.asset.id} />
                    <input type="hidden" name="verificationStatus" value="MISSING" />
                    <button className="danger" type="submit">
                      Missing
                    </button>
                  </form>
                  <form action={verifyItemAction}>
                    <input type="hidden" name="auditCycleId" value={cycle.id} />
                    <input type="hidden" name="assetId" value={item.asset.id} />
                    <input type="hidden" name="verificationStatus" value="DAMAGED" />
                    <button className="secondary" type="submit">
                      Damaged
                    </button>
                  </form>
                </div>
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
