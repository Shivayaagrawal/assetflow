"use server";

import { registerAssetSchema } from "@/modules/asset/validators/register-asset.schema";
import { registerAssetService } from "@/modules/asset/services/register-asset.service";
import { requireSessionUser } from "@/shared/auth/session";
import { runAction } from "@/shared/validation/run-action";

export async function registerAssetAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = registerAssetSchema.parse(input);
    return registerAssetService.execute(user, data);
  });
}
