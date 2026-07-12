import { prisma } from "@/lib/db";
import { requireDepartmentAccess, requireRole } from "@/lib/session";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getDepartmentDashboard(departmentId: string) {
  await requireDepartmentAccess(departmentId);

  const now = new Date();
  const monthStart = startOfMonth(now);

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
        OR: [{ departmentId }, { employee: { departmentId } }],
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
        OR: [{ departmentId }, { employee: { departmentId } }],
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
        fromAllocation: {
          OR: [{ departmentId }, { employee: { departmentId } }],
        },
      },
      orderBy: { createdAt: "asc" },
      include: {
        asset: { select: { id: true, name: true, assetTag: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
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
          { targetEntityType: "Department", targetEntityId: departmentId },
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
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const user = session.user as { role?: string; departmentId?: string | null };
  const scopedDepartmentId =
    user.role === "DEPARTMENT_HEAD" ? user.departmentId : departmentId;

  if (!scopedDepartmentId && user.role === "DEPARTMENT_HEAD") {
    throw new Error("FORBIDDEN");
  }

  const allocationWhere = scopedDepartmentId
    ? { departmentId: scopedDepartmentId }
    : undefined;

  const [utilizationByDepartment, idleAssets, mostUsedAssets, maintenanceFrequency] =
    await Promise.all([
      prisma.allocation.groupBy({
        by: ["departmentId"],
        where: allocationWhere,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.asset.findMany({
        where: {
          status: "AVAILABLE",
          allocations: scopedDepartmentId
            ? { none: { departmentId: scopedDepartmentId, status: "ACTIVE" } }
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
    ]);

  return {
    utilizationByDepartment,
    idleAssets,
    mostUsedAssets,
    maintenanceFrequency,
  };
}
