import { revalidatePath } from "next/cache";
import { decideTransferRequest } from "@/features/allocation/actions";
import { listPendingTransferApprovals } from "@/features/allocation/queries";

const page = {
  fontFamily: "system-ui, sans-serif",
  margin: "0 auto",
  maxWidth: "980px",
  padding: "32px",
};

const card = {
  border: "1px solid #d8dee4",
  borderRadius: "8px",
  padding: "18px",
  background: "#fff",
};

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
    <main style={page}>
      <header style={{ marginBottom: "24px" }}>
        <p style={{ color: "#57606a", margin: 0 }}>Department approvals</p>
        <h1 style={{ margin: "4px 0" }}>Transfer Requests</h1>
      </header>

      <section style={{ display: "grid", gap: "14px" }}>
        {transfers.map((transfer) => (
          <article key={transfer.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <h2 style={{ fontSize: "18px", margin: 0 }}>
                  {transfer.asset.assetTag} · {transfer.asset.name}
                </h2>
                <p style={{ color: "#57606a", margin: "8px 0" }}>
                  Requested by {transfer.requestedBy.name} · {transfer.asset.location}
                </p>
                <p style={{ margin: 0 }}>
                  Current holder:{" "}
                  {transfer.fromAllocation.employee?.name ??
                    transfer.fromAllocation.department?.name ??
                    "Unknown"}
                </p>
              </div>
              <form action={decideTransfer} style={{ display: "flex", gap: "8px" }}>
                <input type="hidden" name="transferRequestId" value={transfer.id} />
                <button name="decision" value="APPROVED" type="submit">
                  Approve
                </button>
                <button name="decision" value="REJECTED" type="submit">
                  Reject
                </button>
              </form>
            </div>
          </article>
        ))}

        {transfers.length === 0 && (
          <section style={card}>
            <p style={{ color: "#57606a", margin: 0 }}>No pending transfer requests.</p>
          </section>
        )}
      </section>
    </main>
  );
}
