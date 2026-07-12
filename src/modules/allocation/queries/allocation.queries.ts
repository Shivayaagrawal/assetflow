import {
  AllocationStatus,
  AssetStatus,
  UserStatus,
} from "@prisma/client";
import { prisma } from "@/shared/database";
import { requireRole } from "@/lib/session";
import { assertDepartmentAccess, requireSessionUser } from "@/shared/auth/session";
import { AuthorizationError } from "@/shared/errors/app-error";

export async function listAvailableAssetsForAllocation() {
  await requireRole("ASSET_MANAGER", "ADMIN");

  return prisma.asset.findMany({
    where: { status: AssetStatus.AVAILABLE },
    orderBy: { assetTag: "asc" },
    select: {
      id: true,
      assetTag: true,
      name: true,
      location: true,
    },
  });
}

export async function listActiveEmployeesForAllocation() {
  await requireRole("ASSET_MANAGER", "ADMIN");

  return prisma.user.findMany({
    where: { status: UserStatus.ACTIVE },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      department: { select: { name: true } },
    },
  });
}

export async function listActiveAllocations() {
  await requireRole("ASSET_MANAGER", "ADMIN");

  return prisma.allocation.findMany({
    where: { status: AllocationStatus.ACTIVE },
    orderBy: { allocatedAt: "desc" },
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
        select: { id: true, name: true, email: true },
      },
      holderDepartment: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function listTransferableAllocations() {
  await requireRole("ASSET_MANAGER", "ADMIN");

  return prisma.allocation.findMany({
    where: {
      status: AllocationStatus.ACTIVE,
      holderEmployeeId: { not: null },
      asset: { status: AssetStatus.ALLOCATED },
    },
    orderBy: { allocatedAt: "desc" },
    select: {
      id: true,
      asset: {
        select: { assetTag: true, name: true, location: true },
      },
      holderEmployee: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function getAllocationById(allocationId: string) {
  await requireRole("ASSET_MANAGER", "ADMIN");

  return prisma.allocation.findUnique({
    where: { id: allocationId },
    select: {
      id: true,
      asset: {
        select: { assetTag: true, name: true },
      },
      holderEmployee: {
        select: { id: true, name: true },
      },
      holderDepartment: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function listPendingTransferRequestsForManager() {
  await requireRole("ASSET_MANAGER", "ADMIN");

  return prisma.transferRequest.findMany({
    where: { status: "REQUESTED" },
    orderBy: { requestedAt: "asc" },
    include: {
      allocation: {
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              name: true,
              location: true,
            },
          },
          holderEmployee: {
            select: { id: true, name: true, email: true },
          },
          holderDepartment: {
            select: { id: true, name: true },
          },
        },
      },
      fromEmployee: {
        select: { id: true, name: true, email: true },
      },
      toEmployee: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function listPendingTransferApprovalsForDepartment(
  departmentId?: string
) {
  const user = await requireSessionUser();
  const scopedDepartmentId =
    user.role === "DEPARTMENT_HEAD" ? user.departmentId : departmentId;

  if (!scopedDepartmentId) {
    throw new AuthorizationError("AUTH_007");
  }

  assertDepartmentAccess(user, scopedDepartmentId);

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
        select: { id: true, name: true, email: true },
      },
      toEmployee: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}
