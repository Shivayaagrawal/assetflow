import type { Allocation, AllocationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class AllocationRepository {
  constructor(private readonly db: Tx = prisma) {}

  findActiveByAsset(assetId: string) {
    return this.db.allocation.findFirst({
      where: { assetId, status: "ACTIVE" },
      include: { holderEmployee: true, holderDepartment: true },
    });
  }

  findById(id: string) {
    return this.db.allocation.findUnique({
      where: { id },
      include: { asset: true, holderEmployee: true },
    });
  }

  create(data: Prisma.AllocationCreateInput) {
    return this.db.allocation.create({ data });
  }

  close(id: string, actualReturnDate: Date, notes?: string) {
    return this.db.allocation.update({
      where: { id },
      data: {
        status: "RETURNED" satisfies AllocationStatus,
        actualReturnDate,
        conditionNotes: notes,
      },
    });
  }
}

export type AllocationEntity = Allocation;
