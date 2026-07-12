import { prisma } from "@/lib/db";
import { requireDepartmentAccess, requireRole } from "@/lib/session";

export async function listPendingTransferApprovals(departmentId?: string) {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const user = session.user;
  const scopedDepartmentId =
    user.role === "DEPARTMENT_HEAD" ? user.departmentId : departmentId;

  if (!scopedDepartmentId) {
    throw new Error("FORBIDDEN");
  }

  await requireDepartmentAccess(scopedDepartmentId);

  return prisma.transferRequest.findMany({
    where: {
      status: "REQUESTED",
      allocation: {
        OR: [
          { holderDepartmentId: scopedDepartmentId },
          { holderEmployee: { departmentId: scopedDepartmentId } },
        ],
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      allocation: {
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              assetTag: true,
              location: true,
            },
          },
          holderEmployee: { select: { id: true, name: true, email: true } },
          holderDepartment: { select: { id: true, name: true } },
        },
      },
      fromEmployee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      toEmployee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
