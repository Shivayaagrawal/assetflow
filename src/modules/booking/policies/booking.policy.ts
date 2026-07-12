import type { Asset, Booking } from "@prisma/client";
import type { SessionUser } from "@/shared/types/action-result";
import { AssetPolicy } from "@/modules/asset/policies/asset.policy";
import { AuthorizationError, ConflictError } from "@/shared/errors/app-error";

export const BookingPolicy = {
  canCreate(user: SessionUser, asset: Asset) {
    return AssetPolicy.canBook(user, asset);
  },

  assertCanCreate(user: SessionUser, asset: Asset) {
    AssetPolicy.assertCanBook(user, asset);
  },

  assertCanModify(user: SessionUser, booking: Booking) {
    if (booking.bookedById !== user.id && user.role === "EMPLOYEE") {
      throw new AuthorizationError("AUTH_007");
    }
    if (booking.status === "CANCELLED") {
      throw new ConflictError("BOOKING_005");
    }
  },

  assertDepartmentScope(
    user: SessionUser,
    departmentId: string
  ) {
    if (user.role === "DEPARTMENT_HEAD" && user.departmentId !== departmentId) {
      throw new AuthorizationError("AUTH_007");
    }
    if (
      user.role !== "DEPARTMENT_HEAD" &&
      user.role !== "ASSET_MANAGER" &&
      user.role !== "ADMIN"
    ) {
      throw new AuthorizationError("AUTH_007");
    }
  },
};
