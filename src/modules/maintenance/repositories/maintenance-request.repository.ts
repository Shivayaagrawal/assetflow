import type { MaintenanceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";
import { ConflictError } from "@/shared/errors/app-error";

type Tx = Prisma.TransactionClient | typeof prisma;

const kanbanInclude = {
  asset: { select: { id: true, assetTag: true, name: true, location: true, departmentId: true } },
  raisedBy: { select: { id: true, name: true, departmentId: true } },
} as const;

export class MaintenanceRequestRepository {
  constructor(private readonly db: Tx = prisma) {}

  create(data: Prisma.MaintenanceRequestCreateInput) {
    return this.db.maintenanceRequest.create({ data });
  }

  findById(id: string) {
    return this.db.maintenanceRequest.findUnique({
      where: { id },
      include: kanbanInclude,
    });
  }

  findByIdOrThrow(id: string) {
    return this.db.maintenanceRequest.findUniqueOrThrow({
      where: { id },
      include: kanbanInclude,
    });
  }

  async updateStatus(
    id: string,
    fromStatus: MaintenanceStatus,
    data: Prisma.MaintenanceRequestUpdateInput
  ) {
    try {
      return await this.db.maintenanceRequest.update({
        where: { id, status: fromStatus },
        data,
      });
    } catch {
      throw new ConflictError("MAINT_005");
    }
  }

  findByRaisedBy(raisedById: string, take = 10) {
    return this.db.maintenanceRequest.findMany({
      where: { raisedById },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        asset: { select: { assetTag: true, name: true } },
      },
    });
  }

  findForKanban() {
    return this.db.maintenanceRequest.findMany({
      where: {
        status: {
          in: ["PENDING", "APPROVED", "TECHNICIAN_ASSIGNED", "IN_PROGRESS"],
        },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: kanbanInclude,
    });
  }
}
