import { AllocationStatus, HolderType } from "@prisma/client";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const requiredId = (field: string) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`);

const optionalReturnDate = z.preprocess(
  emptyToUndefined,
  z.coerce.date({ invalid_type_error: "Expected return date must be valid" }).optional()
);

export const allocateAssetSchema = z.object({
  assetId: requiredId("Asset"),
  employeeId: requiredId("Employee"),
  expectedReturnDate: optionalReturnDate,
  holderType: z.nativeEnum(HolderType).default(HolderType.EMPLOYEE),
});

export const returnAssetSchema = z.object({
  allocationId: requiredId("Allocation"),
  status: z.nativeEnum(AllocationStatus).default(AllocationStatus.RETURNED),
});

export const requestTransferSchema = z.object({
  allocationId: requiredId("Allocation"),
  toEmployeeId: requiredId("New employee"),
  reason: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(500, "Reason must be 500 characters or less").optional()
  ),
});

export type AllocateAssetInput = z.input<typeof allocateAssetSchema>;
export type ReturnAssetInput = z.input<typeof returnAssetSchema>;
export type RequestTransferInput = z.input<typeof requestTransferSchema>;
