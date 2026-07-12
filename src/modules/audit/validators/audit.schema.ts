import { VerificationStatus } from "@prisma/client";
import { z } from "zod";

export const createAuditCycleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  scopeDepartmentId: z.string().min(1).nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  auditorIds: z.array(z.string().min(1)).min(1),
});

export const verifyAssetSchema = z.object({
  auditCycleId: z.string().min(1),
  assetId: z.string().min(1),
  verificationStatus: z.enum(["VERIFIED", "MISSING", "DAMAGED"]),
  notes: z.string().trim().max(500).optional(),
  expectedLocation: z.string().trim().max(200).optional(),
});

export const closeAuditCycleSchema = z.object({
  auditCycleId: z.string().min(1),
});

export type CreateAuditCycleInput = z.infer<typeof createAuditCycleSchema>;
export type VerifyAssetInput = z.infer<typeof verifyAssetSchema>;
export type CloseAuditCycleInput = z.infer<typeof closeAuditCycleSchema>;

export type DiscrepancyItem = {
  assetId: string;
  assetTag: string;
  assetName: string;
  verificationStatus: VerificationStatus;
  notes: string | null;
};
