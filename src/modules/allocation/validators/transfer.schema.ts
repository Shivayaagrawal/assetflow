import { z } from "zod";

export const requestTransferSchema = z.object({
  allocationId: z.string().min(1),
  toEmployeeId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

export const transferDecisionSchema = z.object({
  transferRequestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export type RequestTransferInput = z.infer<typeof requestTransferSchema>;
export type TransferDecisionInput = z.infer<typeof transferDecisionSchema>;
