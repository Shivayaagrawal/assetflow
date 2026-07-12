import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class TransferRequestRepository {
  constructor(private readonly db: Tx = prisma) {}

  findByIdOrThrow(id: string) {
    return this.db.transferRequest.findUniqueOrThrow({
      where: { id },
      include: {
        allocation: {
          include: {
            asset: true,
            holderEmployee: true,
            holderDepartment: true,
          },
        },
        fromEmployee: true,
        toEmployee: true,
      },
    });
  }

  create(data: Prisma.TransferRequestCreateInput) {
    return this.db.transferRequest.create({ data });
  }

  reject(id: string, approvedById: string) {
    return this.db.transferRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedById,
        resolvedAt: new Date(),
      },
    });
  }

  complete(id: string, approvedById: string) {
    return this.db.transferRequest.update({
      where: { id },
      data: {
        status: "COMPLETED",
        approvedById,
        resolvedAt: new Date(),
      },
    });
  }

  listPendingByDepartment(departmentId: string) {
    return this.db.transferRequest.findMany({
      where: {
        status: "REQUESTED",
        allocation: {
          OR: [
            { holderDepartmentId: departmentId },
            { holderEmployee: { departmentId } },
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      include: {
        allocation: {
          include: {
            asset: {
              select: { id: true, name: true, assetTag: true, location: true },
            },
            holderEmployee: { select: { id: true, name: true, email: true } },
            holderDepartment: { select: { id: true, name: true } },
          },
        },
        fromEmployee: { select: { id: true, name: true, email: true } },
        toEmployee: { select: { id: true, name: true, email: true } },
      },
    });
  }
}
