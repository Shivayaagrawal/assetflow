import { revalidatePath } from "next/cache";
import Link from "next/link";
import { returnAsset } from "@/modules/allocation/actions/allocation.actions";
import { requestTransfer } from "@/modules/allocation/actions/transfer.actions";
import {
  listDepartmentPeers,
  listMyAllocations,
} from "@/modules/allocation/actions/transfer.actions";
import { requireRole } from "@/lib/session";

async function submitTransfer(formData: FormData) {
  "use server";

  await requestTransfer({
    allocationId: String(formData.get("allocationId")),
    toEmployeeId: String(formData.get("toEmployeeId")),
    reason: String(formData.get("reason") || "") || undefined,
  });

  revalidatePath("/allocation/my");
  revalidatePath("/dashboard");
}

async function submitReturn(formData: FormData) {
  "use server";

  const result = await returnAsset({
    allocationId: String(formData.get("allocationId")),
    conditionNotes: String(formData.get("conditionNotes") || "") || undefined,
  });

  if (!result.success) {
    throw new Error(result.error?.message ?? "Return failed.");
  }

  revalidatePath("/allocation/my");
  revalidatePath("/dashboard");
  revalidatePath("/assets");
}

export default async function MyAllocationsPage() {
  const session = await requireRole("EMPLOYEE");
  const user = session.user;

  const allocations = await listMyAllocations();
  const peers = user.departmentId ? await listDepartmentPeers() : [];

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Employee workspace</p>
          <h1 className="page-title">My Allocations</h1>
          <p className="page-subtitle">Assets currently assigned to you.</p>
        </div>
        <nav className="nav-row">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/booking">Book resource</Link>
        </nav>
      </header>

      <section className="grid">
        {allocations.map((allocation) => (
          <section className="card" key={allocation.id}>
            <h2 className="card-title">
              {allocation.asset.assetTag} - {allocation.asset.name}
            </h2>
            <p className="muted">
              {allocation.asset.location ?? "No location"} - {allocation.status}
            </p>

            {allocation.status === "ACTIVE" ? (
              <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
                <form action={submitReturn} className="form-grid">
                  <input name="allocationId" type="hidden" value={allocation.id} />
                  <label className="span-full">
                    Condition check-in notes (optional)
                    <textarea
                      name="conditionNotes"
                      placeholder="Note any damage, missing accessories, or general condition"
                      rows={2}
                    />
                  </label>
                  <button className="span-full secondary" type="submit">
                    Return asset
                  </button>
                </form>

                {peers.length > 0 ? (
                  <form action={submitTransfer} className="form-grid">
                    <input name="allocationId" type="hidden" value={allocation.id} />
                    <label className="span-full">
                      Transfer to
                      <select name="toEmployeeId" required>
                        <option value="">Select colleague</option>
                        {peers.map((peer) => (
                          <option key={peer.id} value={peer.id}>
                            {peer.name} - {peer.email}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="span-full">
                      Reason
                      <input name="reason" placeholder="Optional reason" />
                    </label>
                    <button className="span-full" type="submit">
                      Request transfer
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}

            {allocation.transferRequests.length > 0 ? (
              <p className="muted" style={{ marginTop: 12 }}>
                Pending transfer request in review.
              </p>
            ) : null}
          </section>
        ))}

        {allocations.length === 0 ? (
          <section className="card">
            <p className="muted">No allocations assigned yet.</p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
