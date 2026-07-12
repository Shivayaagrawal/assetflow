"use server";

import { allocateAssetSchema, returnAssetSchema } from "@/modules/allocation/validators/allocation.schema";
import { allocateAssetService } from "@/modules/allocation/services/allocate-asset.service";
import { returnAssetService } from "@/modules/allocation/services/return-asset.service";
import { requireSessionUser } from "@/shared/auth/session";
import { runAction } from "@/shared/validation/run-action";

export async function allocateAssetAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = allocateAssetSchema.parse(input);
    return allocateAssetService.execute(user, data);
  });
}

export async function returnAssetAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = returnAssetSchema.parse(input);
    return returnAssetService.execute(user, data);
  });
}
