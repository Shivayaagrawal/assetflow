import { prisma } from "@/shared/database";
import { requireSessionUser } from "@/shared/auth/session";

export async function listRecentActivity(limit = 50) {
  const user = await requireSessionUser();

  const where =
    user.role === "DEPARTMENT_HEAD" && user.departmentId
      ? {
          OR: [
            { actor: { departmentId: user.departmentId } },
            { entityType: "Department", entityId: user.departmentId },
          ],
        }
      : user.role === "EMPLOYEE"
        ? { actorId: user.id }
        : {};

  return prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { id: true, name: true } },
    },
  });
}

export async function listAssetTimeline(assetId: string) {
  await requireSessionUser();

  const [maintenanceIds, auditItemIds, bookingIds, transferIds] =
    await Promise.all([
      prisma.maintenanceRequest.findMany({
        where: { assetId },
        select: { id: true },
      }),
      prisma.auditItem.findMany({
        where: { assetId },
        select: { id: true },
      }),
      prisma.booking.findMany({
        where: { assetId },
        select: { id: true },
      }),
      prisma.transferRequest.findMany({
        where: { allocation: { assetId } },
        select: { id: true },
      }),
    ]);

  const logs = await prisma.activityLog.findMany({
    where: {
      OR: [
        { entityType: "Asset", entityId: assetId },
        {
          entityType: "MaintenanceRequest",
          entityId: { in: maintenanceIds.map((row) => row.id) },
        },
        {
          entityType: "AuditItem",
          entityId: { in: auditItemIds.map((row) => row.id) },
        },
        {
          entityType: "Booking",
          entityId: { in: bookingIds.map((row) => row.id) },
        },
        {
          entityType: "TransferRequest",
          entityId: { in: transferIds.map((row) => row.id) },
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { name: true } },
    },
  });

  return logs.map((log) => ({
    id: log.id,
    at: log.createdAt,
    action: log.action,
    label: formatTimelineAction(log.action),
    actor: log.actor.name,
    entityType: log.entityType,
  }));
}

function formatTimelineAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
