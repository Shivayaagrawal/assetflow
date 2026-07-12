import {
  AllocationStatus,
  AssetStatus,
  UserStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireDepartmentAccess, requireRole } from "@/lib/session";

export async function listAvailableAssetsForAllocation() {
  await requireRole("ASSET_MANAGER");

  return prisma.asset.findMany({
    where: {
      status: AssetStatus.AVAILABLE,
    },
    orderBy: {
      assetTag: "asc",
    },
    select: {
      id: true,
      assetTag: true,
      name: true,
      location: true,
    },
  });
}

export async function listActiveEmployeesForAllocation() {
  await requireRole("ASSET_MANAGER");

  return prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function listActiveAllocations() {
  await requireRole("ASSET_MANAGER");

  return prisma.allocation.findMany({
    where: {
      status: AllocationStatus.ACTIVE,
    },
    orderBy: {
      allocatedAt: "desc",
    },
    select: {
      id: true,
      allocatedAt: true,
      expectedReturnDate: true,
      status: true,
      asset: {
        select: {
          id: true,
          assetTag: true,
          name: true,
          location: true,
        },
      },
      holderEmployee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      holderDepartment: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

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
