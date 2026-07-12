"use client";

import { useState, useTransition } from "react";
import { verifyItemAction } from "./audit-form-actions";

type VerificationStatus = "VERIFIED" | "MISSING" | "DAMAGED";

export function AuditVerifyPanel({
  auditCycleId,
  assetId,
  defaultExpectedLocation,
}: {
  auditCycleId: string;
  assetId: string;
  defaultExpectedLocation?: string | null;
}) {
  const [notes, setNotes] = useState("");
  const [expectedLocation, setExpectedLocation] = useState(defaultExpectedLocation ?? "");
  const [isPending, startTransition] = useTransition();

  function submit(status: VerificationStatus) {
    const formData = new FormData();
    formData.set("auditCycleId", auditCycleId);
    formData.set("assetId", assetId);
    formData.set("verificationStatus", status);
    if (notes.trim()) formData.set("notes", notes.trim());
    if (expectedLocation.trim()) formData.set("expectedLocation", expectedLocation.trim());

    startTransition(async () => {
      await verifyItemAction(formData);
    });
  }

  return (
    <div className="form-grid" style={{ marginTop: 10 }}>
      <label>
        Expected location
        <input
          disabled={isPending}
          onChange={(e) => setExpectedLocation(e.target.value)}
          placeholder="Where the asset should be"
          value={expectedLocation}
        />
      </label>
      <label className="span-full">
        Verification notes
        <textarea
          disabled={isPending}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes for this verification"
          rows={2}
          value={notes}
        />
      </label>
      <div className="actions-row span-full">
        <button disabled={isPending} onClick={() => submit("VERIFIED")} type="button">
          Verified
        </button>
        <button
          className="danger"
          disabled={isPending}
          onClick={() => submit("MISSING")}
          type="button"
        >
          Missing
        </button>
        <button
          className="secondary"
          disabled={isPending}
          onClick={() => submit("DAMAGED")}
          type="button"
        >
          Damaged
        </button>
      </div>
    </div>
  );
}
