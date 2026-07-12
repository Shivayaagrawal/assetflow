import { z } from "zod";

const optionalId = z.string().min(1).optional().nullable();

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  parentId: optionalId,
  parentDepartmentId: optionalId,
  headId: optionalId,
});

export const assetCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  customFields: z.unknown().optional().nullable(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type AssetCategoryInput = z.infer<typeof assetCategorySchema>;
