import { revalidatePath } from "next/cache";
import Link from "next/link";
import {
  closeAuditCycle,
  createAuditCycle,
  getAuditCycle,
  listAuditorCandidates,
  listAuditCycles,
  verifyAsset,
} from "@/modules/audit/actions/audit.actions";
import { listDepartments } from "@/modules/organization/queries/organization.queries";
import { requireRole } from "@/lib/session";

async function createCycle(formData: FormData) {
  "use server";

  const auditorIds = formData.getAll("auditorIds").map(String).filter(Boolean);
  await createAuditCycle({
    name: String(formData.get("name")),
    scopeDepartmentId: String(formData.get("scopeDepartmentId") || "") || null,
    startDate: String(formData.get("startDate")),
    endDate: String(formData.get("endDate")),
    auditorIds,
  });

  revalidatePath("/audit");
}

async function verifyItem(formData: FormData) {
  "use server";

  await verifyAsset({
    auditCycleId: String(formData.get("auditCycleId")),
    assetId: String(formData.get("assetId")),
    verificationStatus: formData.get("verificationStatus") as
      | "VERIFIED"
      | "MISSING"
      | "DAMAGED",
    notes: String(formData.get("notes") || "") || undefined,
  });

  revalidatePath("/audit");
  revalidatePath(`/audit/${String(formData.get("auditCycleId"))}`);
}

async function closeCycle(formData: FormData) {
  "use server";

  const cycleId = String(formData.get("auditCycleId"));
  await closeAuditCycle({ auditCycleId: cycleId });
  revalidatePath("/audit");
  revalidatePath(`/audit/${cycleId}`);
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ cycle?: string }>;
}) {
  const { user } = await requireRole("ASSET_MANAGER", "ADMIN", "DEPARTMENT_HEAD", "EMPLOYEE");
  const params = await searchParams;
  const cycles = await listAuditCycles();
  const departments = await listDepartments();
  const auditors = await listAuditorCandidates();

  const selectedCycleId = params.cycle ?? cycles[0]?.id;
  const selectedCycle = selectedCycleId ? await getAuditCycle(selectedCycleId) : null;

  const canManage = user.role === "ASSET_MANAGER" || user.role === "ADMIN";
  const assignedCycleIds = new Set(
    cycles
      .filter((cycle) => cycle.auditors.some((row) => row.auditorId === user.id))
      .map((cycle) => cycle.id)
  );
  const canVerify =
    selectedCycle &&
    (canManage || assignedCycleIds.has(selectedCycle.id));

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
        <nav className="nav-row">
          {cycles.map((cycle) => (
            <Link href={`/audit?cycle=${cycle.id}`} key={cycle.id}>
              {cycle.name}
            </Link>
          ))}
        </nav>
      </header>

      <section className="grid two">
        {canManage && (
          <form action={createCycle} className="card form-grid">
            <h2 className="card-title span-full">Create audit cycle</h2>
            <label className="span-full">
              Name
              <input name="name" required placeholder="Q3 Engineering audit" />
            </label>
            <label className="span-full">
              Department scope
              <select name="scopeDepartmentId" defaultValue="">
                <option value="">All departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
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
                <p className="muted">
                  {cycle.items.length} assets · {cycle.auditors.length} auditors ·{" "}
                  {cycle.status}
                </p>
                <Link href={`/audit?cycle=${cycle.id}`}>Open</Link>
              </article>
            ))}
            {cycles.length === 0 && <p className="muted">No open audit cycles.</p>}
          </div>
        </section>
      </section>

      {selectedCycle && (
        <section className="card" style={{ marginTop: 24 }}>
          <div className="page-header" style={{ marginBottom: 16 }}>
            <div>
              <h2 className="card-title">{selectedCycle.name}</h2>
              <p className="muted">
                {selectedCycle.startDate.toISOString().slice(0, 10)} —{" "}
                {selectedCycle.endDate.toISOString().slice(0, 10)}
              </p>
            </div>
            {canManage && selectedCycle.status === "OPEN" && (
              <form action={closeCycle}>
                <input type="hidden" name="auditCycleId" value={selectedCycle.id} />
                <button type="submit">Close cycle</button>
              </form>
            )}
          </div>

          <div className="list">
            {selectedCycle.items.map((item) => (
              <article className="list-item" key={item.id}>
                <strong>
                  {item.asset.assetTag} — {item.asset.name}
                </strong>
                <p className="muted">
                  Expected: {item.expectedLocation ?? "—"} · Status:{" "}
                  {item.verificationStatus}
                  {item.verifiedBy ? ` · by ${item.verifiedBy.name}` : ""}
                </p>

                {canVerify &&
                  selectedCycle.status === "OPEN" &&
                  item.verificationStatus === "PENDING" && (
                    <div className="actions-row">
                      <form action={verifyItem}>
                        <input type="hidden" name="auditCycleId" value={selectedCycle.id} />
                        <input type="hidden" name="assetId" value={item.asset.id} />
                        <input type="hidden" name="verificationStatus" value="VERIFIED" />
                        <button type="submit">Verified</button>
                      </form>
                      <form action={verifyItem}>
                        <input type="hidden" name="auditCycleId" value={selectedCycle.id} />
                        <input type="hidden" name="assetId" value={item.asset.id} />
                        <input type="hidden" name="verificationStatus" value="MISSING" />
                        <button className="danger" type="submit">
                          Missing
                        </button>
                      </form>
                      <form action={verifyItem}>
                        <input type="hidden" name="auditCycleId" value={selectedCycle.id} />
                        <input type="hidden" name="assetId" value={item.asset.id} />
                        <input type="hidden" name="verificationStatus" value="DAMAGED" />
                        <button type="submit">Damaged</button>
                      </form>
                    </div>
                  )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
