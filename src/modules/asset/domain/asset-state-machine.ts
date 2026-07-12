import type { AssetStatus } from "@prisma/client";
import { AppError } from "@/shared/errors/app-error";

const ALLOWED: Record<AssetStatus, readonly AssetStatus[]> = {
  AVAILABLE: [
    "ALLOCATED",
    "UNDER_MAINTENANCE",
    "RESERVED",
    "LOST",
    "RETIRED",
    "DISPOSED",
  ],
  ALLOCATED: ["AVAILABLE", "UNDER_MAINTENANCE", "LOST"],
  RESERVED: ["AVAILABLE"],
  UNDER_MAINTENANCE: ["AVAILABLE", "ALLOCATED"],
  LOST: ["RETIRED"],
  RETIRED: [],
  DISPOSED: [],
};

export const AssetStateMachine = {
  canTransition(from: AssetStatus, to: AssetStatus): boolean {
    if (from === to) return true;
    return ALLOWED[from].includes(to);
  },

  assertTransition(from: AssetStatus, to: AssetStatus): void {
    if (!this.canTransition(from, to)) {
      throw new AppError("ASSET_003");
    }
  },
};
