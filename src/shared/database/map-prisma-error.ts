import { Prisma } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";

export function mapPrismaError(error: unknown): never {
  if (
    error instanceof Error &&
    (error.message.includes("23P01") || error.message.includes("no_overlapping_bookings"))
  ) {
    throw new ConflictError("BOOKING_002");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("serialNumber") || target.includes("assetTag")) {
        throw new ConflictError("ASSET_002");
      }
      if (target.includes("one_active_allocation_per_asset")) {
        throw new ConflictError("ASSET_004");
      }
      if (target.includes("no_overlapping_bookings")) {
        throw new ConflictError("BOOKING_002");
      }
      if (target.includes("one_active_maintenance_per_asset")) {
        throw new ConflictError("MAINT_002");
      }
      if (target.includes("email")) {
        throw new ConflictError("AUTH_006");
      }
      throw new ConflictError("GEN_001");
    }
    if (error.code === "P2025") {
      throw new NotFoundError("GEN_002");
    }
  }
  throw error;
}
