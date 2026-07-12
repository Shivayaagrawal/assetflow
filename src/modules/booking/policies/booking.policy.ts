import type { Asset } from "@prisma/client";
import type { SessionUser } from "@/shared/types/action-result";
import { AssetPolicy } from "@/modules/asset/policies/asset.policy";

export const BookingPolicy = {
  canCreate(user: SessionUser, asset: Asset) {
    return AssetPolicy.canBook(user, asset);
  },

  assertCanCreate(user: SessionUser, asset: Asset) {
    AssetPolicy.assertCanBook(user, asset);
  },
};
