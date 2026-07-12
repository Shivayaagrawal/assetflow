import { AssetCondition } from "@prisma/client";
import { z } from "zod";

const trimmedRequired = (field: string) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`);

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), {
    message: "Photo URL must start with http:// or https://",
  });

export const registerAssetSchema = z.object({
  name: trimmedRequired("Asset name"),
  categoryId: trimmedRequired("Category"),
  serialNumber: trimmedRequired("Serial number"),
  acquisitionDate: z.coerce
    .date({
      required_error: "Acquisition date is required",
      invalid_type_error: "Acquisition date must be valid",
    })
    .refine((date) => !Number.isNaN(date.getTime()), {
      message: "Acquisition date must be valid",
    }),
  acquisitionCost: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce
      .number({
        required_error: "Acquisition cost is required",
        invalid_type_error: "Acquisition cost must be a number",
      })
      .min(0, "Acquisition cost cannot be negative")
  ),
  condition: z.nativeEnum(AssetCondition),
  location: trimmedRequired("Location"),
  photoUrl: optionalUrl,
  isBookable: z.boolean().default(false),
});

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;
