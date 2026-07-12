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
      parentId: true,
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
          children: true,
          allocations: true,
        },
      },
    },
  });
}

export async function listAssetCategories() {
  await requireSession();

  return prisma.assetCategory.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      customFields: true,
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
