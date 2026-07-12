import type { Prisma, VerificationStatus } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

const cycleInclude = {
  auditors: {
    include: { auditor: { select: { id: true, name: true, email: true } } },
  },
  items: {
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          location: true,
          status: true,
        },
      },
      verifiedBy: { select: { id: true, name: true } },
    },
    orderBy: { assetId: "asc" },
  },
} as const;

export class AuditRepository {
  constructor(private readonly db: Tx = prisma) {}

  findById(id: string) {
    return this.db.auditCycle.findUnique({
      where: { id },
      include: cycleInclude,
    });
  }

  findByIdOrThrow(id: string) {
    return this.db.auditCycle.findUniqueOrThrow({
      where: { id },
      include: cycleInclude,
    });
  }

  listOpen() {
    return this.db.auditCycle.findMany({
      where: { status: "OPEN" },
      orderBy: { startDate: "desc" },
      include: cycleInclude,
    });
  }

  findOverlappingOpen(scopeDepartmentId: string | null, startDate: Date, endDate: Date) {
    return this.db.auditCycle.findFirst({
      where: {
        status: "OPEN",
        scopeDepartmentId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }

  createCycle(data: {
    name: string;
    scopeDepartmentId: string | null;
    startDate: Date;
    endDate: Date;
    createdById: string;
    auditorIds: string[];
    assets: { id: string; location: string | null }[];
  }) {
    return this.db.auditCycle.create({
      data: {
        name: data.name,
        scopeDepartmentId: data.scopeDepartmentId,
        startDate: data.startDate,
        endDate: data.endDate,
        createdBy: { connect: { id: data.createdById } },
        auditors: {
          create: data.auditorIds.map((auditorId) => ({
            auditor: { connect: { id: auditorId } },
          })),
        },
        items: {
          create: data.assets.map((asset) => ({
            asset: { connect: { id: asset.id } },
            expectedLocation: asset.location,
            verificationStatus: "PENDING",
          })),
        },
      },
      include: cycleInclude,
    });
  }

  findItem(auditCycleId: string, assetId: string) {
    return this.db.auditItem.findUnique({
      where: { auditCycleId_assetId: { auditCycleId, assetId } },
      include: {
        asset: true,
        auditCycle: { include: { auditors: true } },
      },
    });
  }

  verifyItem(
    auditCycleId: string,
    assetId: string,
    data: {
      verificationStatus: VerificationStatus;
      notes?: string | null;
      expectedLocation?: string | null;
      verifiedById: string;
    }
  ) {
    return this.db.auditItem.update({
      where: { auditCycleId_assetId: { auditCycleId, assetId } },
      data: {
        verificationStatus: data.verificationStatus,
        notes: data.notes,
        expectedLocation: data.expectedLocation,
        verifiedBy: { connect: { id: data.verifiedById } },
        verifiedAt: new Date(),
      },
    });
  }

  closeCycle(cycleId: string) {
    return this.db.auditCycle.update({
      where: { id: cycleId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: new Date() },
    });
  }

  listDiscrepancies(cycleId: string) {
    return this.db.auditItem.findMany({
      where: {
        auditCycleId: cycleId,
        verificationStatus: { in: ["MISSING", "DAMAGED"] },
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
      },
    });
  }

  listMissingItems(cycleId: string) {
    return this.db.auditItem.findMany({
      where: { auditCycleId: cycleId, verificationStatus: "MISSING" },
      include: { asset: true },
    });
  }

  isAuditor(cycleId: string, userId: string) {
    return this.db.auditCycleAuditor.findUnique({
      where: { auditCycleId_auditorId: { auditCycleId: cycleId, auditorId: userId } },
    });
  }
}
