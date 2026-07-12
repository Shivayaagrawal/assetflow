import { z } from "zod";

export const registerAssetSchema = z.object({
  name: z.string().min(1),
  serialNumber: z.string().min(1),
  categoryId: z.string().min(1),
  acquisitionDate: z.coerce.date(),
  acquisitionCost: z.coerce.number().min(0),
  condition: z.enum(["NEW", "GOOD", "FAIR", "POOR"]).default("GOOD"),
  location: z.string().min(1),
  isBookable: z.boolean().default(false),
});

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;
