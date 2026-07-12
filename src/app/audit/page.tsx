import Link from "next/link";
import { DepartmentPicker } from "@/components/DepartmentPicker";
import {
  listAuditorCandidates,
  listAuditCycles,
} from "@/modules/audit/actions/audit.actions";
import { requireRole } from "@/lib/session";
import { formatDate } from "@/shared/format/date";
import { createCycleAction } from "./audit-form-actions";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { user } = await requireRole(
    "ASSET_MANAGER",
    "ADMIN",
    "DEPARTMENT_HEAD",
    "EMPLOYEE"
  );
  const cycles = await listAuditCycles();
  const auditors = await listAuditorCandidates();
  const canManage = user.role === "ASSET_MANAGER" || user.role === "ADMIN";

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Compliance</p>
          <h1 className="page-title">Asset Audit</h1>
          <p className="page-subtitle">
            Verify assets in scope, flag discrepancies, and close cycles.
          </p>
        </div>
      </header>

      <section className="grid two">
        {canManage && (
          <form action={createCycleAction} className="card form-grid">
            <h2 className="card-title span-full">Create audit cycle</h2>
            <label className="span-full">
              Name
              <input name="name" required placeholder="Q3 Engineering audit" />
            </label>
            <label className="span-full">
              Department scope
              <DepartmentPicker
                includeEmpty
                name="scopeDepartmentId"
                placeholder="All departments"
              />
            </label>
            <label>
              Start
              <input name="startDate" type="date" required />
            </label>
            <label>
              End
              <input name="endDate" type="date" required />
            </label>
            <label className="span-full">
              Auditors
              <select name="auditorIds" multiple required size={4}>
                {auditors.map((auditor) => (
                  <option key={auditor.id} value={auditor.id}>
                    {auditor.name} ({auditor.role})
                  </option>
                ))}
              </select>
            </label>
            <button className="span-full" type="submit">
              Create cycle
            </button>
          </form>
        )}

        <section className="card">
          <h2 className="card-title">Open cycles</h2>
          <div className="list">
            {cycles.map((cycle) => (
              <article className="list-item" key={cycle.id}>
                <strong>{cycle.name}</strong>
                <p className="muted" style={{ margin: "4px 0 8px" }}>
                  {cycle.items.length} assets · {cycle.auditors.length} auditors ·{" "}
                  {cycle.status}
                </p>
                <p className="muted" style={{ margin: "0 0 10px" }}>
                  {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                </p>
                <Link className="button secondary" href={`/audit/${cycle.id}`}>
                  Open cycle
                </Link>
              </article>
            ))}
            {cycles.length === 0 && (
              <p className="muted" style={{ margin: 0 }}>
                No open audit cycles.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
