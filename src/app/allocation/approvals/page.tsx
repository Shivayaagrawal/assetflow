import { revalidatePath } from "next/cache";
import { decideTransferRequest } from "@/features/allocation/actions";
import { listPendingTransferApprovals } from "@/features/allocation/queries";

async function decideTransfer(formData: FormData) {
  "use server";

  await decideTransferRequest({
    transferRequestId: String(formData.get("transferRequestId")),
    decision: formData.get("decision") === "APPROVED" ? "APPROVED" : "REJECTED",
  });

  revalidatePath("/allocation/approvals");
  revalidatePath("/dashboard");
}

export default async function TransferApprovalsPage() {
  const transfers = await listPendingTransferApprovals();

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Department approvals</p>
          <h1 className="page-title">Transfer Requests</h1>
          <p className="page-subtitle">Review only requests inside your department scope.</p>
        </div>
      </header>

      <section className="grid">
        {transfers.map((transfer) => (
          <article className="card" key={transfer.id}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <div>
                <span className="status-pill">Requested</span>
                <h2 className="card-title" style={{ marginTop: 10 }}>
                  {transfer.asset.assetTag} - {transfer.asset.name}
                </h2>
                <p className="muted">
                  Requested by {transfer.requestedBy.name} - {transfer.asset.location}
                </p>
                <p>
                  Current holder:{" "}
                  {transfer.fromAllocation.employee?.name ??
                    transfer.fromAllocation.department?.name ??
                    "Unknown"}
                </p>
              </div>
              <form action={decideTransfer} className="actions-row">
                <input type="hidden" name="transferRequestId" value={transfer.id} />
                <button name="decision" value="APPROVED" type="submit">
                  Approve
                </button>
                <button className="danger" name="decision" value="REJECTED" type="submit">
                  Reject
                </button>
              </form>
            </div>
          </article>
        ))}

        {transfers.length === 0 && (
          <section className="card">
            <p className="muted" style={{ margin: 0 }}>
              No pending transfer requests.
            </p>
          </section>
        )}
      </section>
    </main>
  );
}
