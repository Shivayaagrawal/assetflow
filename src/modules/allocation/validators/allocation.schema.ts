import { z } from "zod";

export const allocateAssetSchema = z.object({
  assetId: z.string().min(1),
  employeeId: z.string().min(1),
  expectedReturnDate: z.coerce.date().optional(),
});

export type AllocateAssetInput = z.infer<typeof allocateAssetSchema>;

export const returnAssetSchema = z.object({
  allocationId: z.string().min(1),
  conditionCheckinNotes: z.string().optional(),
});

export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;
