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

export type AllocateAssetInput = z.input<typeof allocateAssetSchema>;
export type ReturnAssetInput = z.input<typeof returnAssetSchema>;
