import type { Asset, AssetStatus } from "@prisma/client";
import type { SessionUser } from "@/shared/types/action-result";
import {
  AuthorizationError,
  ConflictError,
} from "@/shared/errors/app-error";

const MANAGER_ROLES = new Set<SessionUser["role"]>(["ASSET_MANAGER", "ADMIN"]);
const ALLOCATABLE: AssetStatus[] = ["AVAILABLE"];
const BOOKABLE: AssetStatus[] = ["AVAILABLE", "RESERVED"];
const TERMINAL: AssetStatus[] = ["RETIRED", "DISPOSED"];

export const AssetPolicy = {
  canRegister(user: SessionUser) {
    return MANAGER_ROLES.has(user.role);
  },

  canAllocate(user: SessionUser, asset: Asset) {
    if (!MANAGER_ROLES.has(user.role)) return false;
    return ALLOCATABLE.includes(asset.status);
  },

  canBook(user: SessionUser, asset: Asset) {
    if (asset.isBookable !== true) return false;
    if (!BOOKABLE.includes(asset.status)) return false;
    if (user.status !== "ACTIVE") return false;
    return true;
  },

  canView(user: SessionUser) {
    return user.status === "ACTIVE";
  },

  assertCanRegister(user: SessionUser) {
    if (!this.canRegister(user)) throw new AuthorizationError("AUTH_007");
  },

  assertCanAllocate(user: SessionUser, asset: Asset) {
    if (!MANAGER_ROLES.has(user.role)) {
      throw new AuthorizationError("AUTH_007");
    }
    if (TERMINAL.includes(asset.status)) {
      throw new ConflictError("ASSET_006");
    }
    if (asset.status === "UNDER_MAINTENANCE") {
      throw new ConflictError("ASSET_005");
    }
    if (!ALLOCATABLE.includes(asset.status)) {
      throw new ConflictError("ALLOC_002");
    }
  },

  assertCanBook(user: SessionUser, asset: Asset) {
    if (!this.canBook(user, asset)) {
      throw new ConflictError("BOOKING_004");
    }
  },
};
