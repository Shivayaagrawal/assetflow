"use server";

import { revalidatePath } from "next/cache";
import {
  closeAuditCycle,
  createAuditCycle,
  verifyAsset,
} from "@/modules/audit/actions/audit.actions";

export async function createCycleAction(formData: FormData) {
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

export async function verifyItemAction(formData: FormData) {
  const auditCycleId = String(formData.get("auditCycleId"));

  await verifyAsset({
    auditCycleId,
    assetId: String(formData.get("assetId")),
    verificationStatus: formData.get("verificationStatus") as
      | "VERIFIED"
      | "MISSING"
      | "DAMAGED",
    notes: String(formData.get("notes") || "") || undefined,
    expectedLocation: String(formData.get("expectedLocation") || "") || undefined,
  });

  revalidatePath("/audit");
  revalidatePath(`/audit/${auditCycleId}`);
}

export async function closeCycleAction(formData: FormData) {
  const auditCycleId = String(formData.get("auditCycleId"));
  await closeAuditCycle({ auditCycleId });
  revalidatePath("/audit");
  revalidatePath(`/audit/${auditCycleId}`);
}
