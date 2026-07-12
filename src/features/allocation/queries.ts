import { prisma } from "@/lib/db";
import { requireDepartmentAccess, requireRole } from "@/lib/session";

export async function listPendingTransferApprovals(departmentId?: string) {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const user = session.user as { role?: string; departmentId?: string | null };
  const scopedDepartmentId =
    user.role === "DEPARTMENT_HEAD" ? user.departmentId : departmentId;

  if (!scopedDepartmentId) {
    throw new Error("FORBIDDEN");
  }

  await requireDepartmentAccess(scopedDepartmentId);

  return prisma.transferRequest.findMany({
    where: {
      status: "REQUESTED",
      fromAllocation: {
        OR: [
          { departmentId: scopedDepartmentId },
          { employee: { departmentId: scopedDepartmentId } },
        ],
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      asset: {
        select: {
          id: true,
          name: true,
          assetTag: true,
          location: true,
        },
      },
      requestedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      fromAllocation: {
        include: {
          employee: { select: { id: true, name: true, email: true } },
          department: { select: { id: true, name: true } },
        },
      },
    },
  });
}
