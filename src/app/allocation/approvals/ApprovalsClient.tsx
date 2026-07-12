"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideTransferRequest } from "@/features/allocation/actions";

type Transfer = {
  id: string;
  status: string;
  allocation: {
    id: string;
    asset: {
      id: string;
      name: string;
      assetTag: string;
      location: string | null;
    };
    holderEmployee: { id: string; name: string; email: string } | null;
    holderDepartment: { id: string; name: string } | null;
  };
  fromEmployee: { id: string; name: string; email: string };
  toEmployee: { id: string; name: string; email: string };
};

type Message = { kind: "success" | "error"; text: string } | null;

function friendlyError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";
  const msg = error.message;

  if (msg === "FORBIDDEN" || msg === "AUTH_007") {
    return "You do not have permission to approve this transfer request.";
  }
  if (msg === "ALLOC_004") {
    return "This transfer request is no longer pending.";
  }
  if (msg === "UNAUTHORIZED" || msg === "AUTH_002") {
    return "Your session expired. Sign in again and retry.";
  }
  return msg || "Something went wrong. Try again.";
}

export function ApprovalsClient({ transfers }: { transfers: Transfer[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  function handleDecision(transferRequestId: string, decision: "APPROVED" | "REJECTED") {
    setMessage(null);
    startTransition(async () => {
      try {
        await decideTransferRequest({
          transferRequestId,
          decision,
        });
        setMessage({
          kind: "success",
          text: `Transfer request successfully ${decision === "APPROVED" ? "approved" : "rejected"}.`,
        });
        router.refresh();
      } catch (error) {
        setMessage({ kind: "error", text: friendlyError(error) });
      }
    });
  }

  return (
    <>
      {message && (
        <div className={`notice ${message.kind}`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}

      <section className="grid">
        {transfers.map((transfer) => (
          <article className="card" key={transfer.id}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <div>
                <span className="status-pill">Requested</span>
                <h2 className="card-title" style={{ marginTop: 10 }}>
                  {transfer.allocation.asset.assetTag} — {transfer.allocation.asset.name}
                </h2>
                <p className="muted" style={{ margin: "4px 0" }}>
                  Requested by: {transfer.fromEmployee.name} ({transfer.fromEmployee.email})
                </p>
                <p className="muted" style={{ margin: "4px 0" }}>
                  Target Recipient: {transfer.toEmployee.name} ({transfer.toEmployee.email})
                </p>
                <p className="muted" style={{ margin: "4px 0" }}>
                  Current holder:{" "}
                  {transfer.allocation.holderEmployee?.name ??
                    transfer.allocation.holderDepartment?.name ??
                    "Unknown holder"}
                </p>
              </div>
              <div className="actions-row">
                <button
                  disabled={isPending}
                  onClick={() => handleDecision(transfer.id, "APPROVED")}
                  type="button"
                >
                  {isPending ? "Processing…" : "Approve"}
                </button>
                <button
                  disabled={isPending}
                  className="danger"
                  onClick={() => handleDecision(transfer.id, "REJECTED")}
                  type="button"
                >
                  {isPending ? "Processing…" : "Reject"}
                </button>
              </div>
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
    </>
  );
}
