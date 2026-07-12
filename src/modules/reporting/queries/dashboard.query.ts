import { prisma } from "@/shared/database";
import { assertDepartmentAccess, assertRole, requireSessionUser } from "@/shared/auth/session";
import { AuthorizationError } from "@/shared/errors/app-error";

function allocationDepartmentFilter(departmentId: string) {
  return {
    OR: [
      { holderDepartmentId: departmentId },
      { holderEmployee: { departmentId } },
    ],
  };
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getDepartmentDashboard(departmentId: string) {
  const user = await requireSessionUser();
  assertDepartmentAccess(user, departmentId);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const allocationScope = allocationDepartmentFilter(departmentId);

  const [
    department,
    activeAllocations,
    overdueAllocations,
    pendingTransfers,
    upcomingBookings,
    recentActivity,
  ] = await Promise.all([
    prisma.department.findUniqueOrThrow({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.allocation.findMany({
      where: {
        status: "ACTIVE",
        ...allocationScope,
      },
      orderBy: { allocatedAt: "desc" },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetTag: true,
            status: true,
            location: true,
          },
        },
      },
    }),
    prisma.allocation.findMany({
      where: {
        status: "ACTIVE",
        ...allocationScope,
        expectedReturnDate: { lt: now },
      },
      orderBy: { expectedReturnDate: "asc" },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
      },
    }),
    prisma.transferRequest.findMany({
      where: {
        status: "REQUESTED",
        allocation: allocationScope,
      },
      orderBy: { createdAt: "asc" },
      include: {
        allocation: {
          include: {
            asset: { select: { id: true, name: true, assetTag: true } },
          },
        },
        fromEmployee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.booking.findMany({
      where: {
        startTime: { gte: now },
        status: "UPCOMING",
        bookedBy: { departmentId },
      },
      orderBy: { startTime: "asc" },
      take: 10,
      include: {
        asset: { select: { id: true, name: true, assetTag: true, location: true } },
        bookedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        createdAt: { gte: monthStart },
        OR: [
          { entityType: "Department", entityId: departmentId },
          {
            actor: { departmentId },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        actor: { select: { id: true, name: true } },
      },
    }),
  ]);

  return {
    department,
    metrics: {
      activeAllocationCount: activeAllocations.length,
      overdueAllocationCount: overdueAllocations.length,
      pendingTransferCount: pendingTransfers.length,
      upcomingBookingCount: upcomingBookings.length,
    },
    activeAllocations,
    overdueAllocations,
    pendingTransfers,
    upcomingBookings,
    recentActivity,
  };
}

export async function getReportsOverview(departmentId?: string) {
  const user = await requireSessionUser();
  assertRole(user, "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const scopedDepartmentId =
    user.role === "DEPARTMENT_HEAD" ? user.departmentId : departmentId;

  if (!scopedDepartmentId && user.role === "DEPARTMENT_HEAD") {
    throw new AuthorizationError("AUTH_007");
  }

  const allocationWhere = scopedDepartmentId
    ? allocationDepartmentFilter(scopedDepartmentId)
    : undefined;

  const [
    utilizationGroups,
    idleAssets,
    mostUsedGroups,
    maintenanceGroups,
    verifiedCount,
    missingCount,
    damagedCount,
    pendingCount,
  ] = await Promise.all([
      prisma.allocation.groupBy({
        by: ["holderDepartmentId"],
        where: allocationWhere,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.asset.findMany({
        where: {
          status: "AVAILABLE",
          allocations: scopedDepartmentId
            ? {
                none: {
                  status: "ACTIVE",
                  ...allocationDepartmentFilter(scopedDepartmentId),
                },
              }
            : undefined,
        },
        orderBy: { updatedAt: "asc" },
        take: 10,
        select: {
          id: true,
          name: true,
          assetTag: true,
          updatedAt: true,
          location: true,
        },
      }),
      prisma.allocation.groupBy({
        by: ["assetId"],
        where: allocationWhere,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.maintenanceRequest.groupBy({
        by: ["assetId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.auditItem.count({ where: { verificationStatus: "VERIFIED" } }),
      prisma.auditItem.count({ where: { verificationStatus: "MISSING" } }),
      prisma.auditItem.count({ where: { verificationStatus: "DAMAGED" } }),
      prisma.auditItem.count({ where: { verificationStatus: "PENDING" } }),
    ]);

  const departmentIds = utilizationGroups
    .map((item) => item.holderDepartmentId)
    .filter((id): id is string => Boolean(id));
  const assetIds = Array.from(
    new Set([
      ...mostUsedGroups.map((item) => item.assetId),
      ...maintenanceGroups.map((item) => item.assetId),
    ])
  );

  const [departments, assets] = await Promise.all([
    prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true, name: true },
    }),
    prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, name: true, assetTag: true, location: true },
    }),
  ]);

  const departmentNameById = new Map(
    departments.map((department) => [department.id, department.name])
  );
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  return {
    utilizationByDepartment: utilizationGroups.map((item) => ({
      departmentId: item.holderDepartmentId,
      departmentName: item.holderDepartmentId
        ? departmentNameById.get(item.holderDepartmentId) ?? "Unknown department"
        : "Employee-held",
      count: item._count.id,
    })),
    idleAssets,
    mostUsedAssets: mostUsedGroups.map((item) => {
      const asset = assetById.get(item.assetId);
      return {
        assetId: item.assetId,
        assetName: asset ? `${asset.assetTag} - ${asset.name}` : "Unknown asset",
        location: asset?.location ?? "Unknown location",
        count: item._count.id,
      };
    }),
    maintenanceFrequency: maintenanceGroups.map((item) => {
      const asset = assetById.get(item.assetId);
      return {
        assetId: item.assetId,
        assetName: asset ? `${asset.assetTag} - ${asset.name}` : "Unknown asset",
        location: asset?.location ?? "Unknown location",
        count: item._count.id,
      };
    }),
    auditReport: {
      verified: verifiedCount,
      missing: missingCount,
      damaged: damagedCount,
      pending: pendingCount,
    },
  };
}
