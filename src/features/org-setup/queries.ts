import { prisma } from "@/lib/db";
import { requireRole, requireSession } from "@/lib/session";

export async function listDepartments(options?: { activeOnly?: boolean }) {
  await requireSession();

  return prisma.department.findMany({
    where: options?.activeOnly ? { status: "ACTIVE" } : undefined,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      status: true,
      parentDepartmentId: true,
      head: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          members: true,
          childDepartments: true,
          allocations: true,
        },
      },
    },
  });
}

export async function listAssetCategories(options?: { activeOnly?: boolean }) {
  await requireSession();

  return prisma.assetCategory.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      customFields: true,
      isActive: true,
      _count: {
        select: { assets: true },
      },
    },
  });
}

export async function listEmployeeDirectory() {
  await requireRole("ADMIN");

  return prisma.user.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      departmentId: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      createdAt: true,
    },
  });
}
