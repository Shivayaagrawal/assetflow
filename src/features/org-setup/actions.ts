"use server";

import { DepartmentStatus, UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { logActivity } from "@/features/activity-log/log-activity";

const optionalId = z.string().min(1).optional().nullable();

const departmentInput = z.object({
  name: z.string().trim().min(2).max(120),
  parentDepartmentId: optionalId,
  headId: optionalId,
});

const categoryInput = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.string().trim().max(80).optional().nullable(),
  customFields: z.unknown().optional().nullable(),
});

const employeeRoleInput = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(UserRole),
  departmentId: optionalId,
  status: z.nativeEnum(UserStatus).optional(),
});

function actorIdFrom(session: Awaited<ReturnType<typeof requireRole>>) {
  return session.user.id;
}

export async function createDepartment(input: z.input<typeof departmentInput>) {
  const session = await requireRole("ADMIN");
  const data = departmentInput.parse(input);

  return prisma.$transaction(async (tx) => {
    const department = await tx.department.create({
      data: {
        name: data.name,
        parentDepartmentId: data.parentDepartmentId ?? null,
        headId: data.headId ?? null,
      },
    });

    if (data.headId) {
      await tx.user.update({
        where: { id: data.headId },
        data: {
          role: "DEPARTMENT_HEAD",
          departmentId: department.id,
          status: "ACTIVE",
        },
      });
    }

    await logActivity(tx, {
      actorId: actorIdFrom(session),
      actionType: "DEPARTMENT_CREATED",
      targetEntityType: "Department",
      targetEntityId: department.id,
      description: `Created department ${department.name}`,
      newValue: department,
    });

    return department;
  });
}

export async function updateDepartment(
  departmentId: string,
  input: z.input<typeof departmentInput>
) {
  const session = await requireRole("ADMIN");
  const data = departmentInput.parse(input);

  if (data.parentDepartmentId === departmentId) {
    throw new Error("ORG_001");
  }

  return prisma.$transaction(async (tx) => {
    const previous = await tx.department.findUniqueOrThrow({
      where: { id: departmentId },
    });

    const department = await tx.department.update({
      where: { id: departmentId },
      data: {
        name: data.name,
        parentDepartmentId: data.parentDepartmentId ?? null,
        headId: data.headId ?? null,
      },
    });

    if (previous.headId && previous.headId !== data.headId) {
      await tx.user.update({
        where: { id: previous.headId },
        data: { role: "EMPLOYEE" },
      });
    }

    if (data.headId) {
      await tx.user.update({
        where: { id: data.headId },
        data: {
          role: "DEPARTMENT_HEAD",
          departmentId,
          status: "ACTIVE",
        },
      });
    }

    await logActivity(tx, {
      actorId: actorIdFrom(session),
      actionType: "DEPARTMENT_UPDATED",
      targetEntityType: "Department",
      targetEntityId: department.id,
      description: `Updated department ${department.name}`,
      oldValue: previous,
      newValue: department,
    });

    return department;
  });
}

export async function deactivateDepartment(departmentId: string) {
  const session = await requireRole("ADMIN");

  return prisma.$transaction(async (tx) => {
    const activeMembers = await tx.user.count({
      where: { departmentId, status: "ACTIVE" },
    });

    if (activeMembers > 0) {
      throw new Error("ORG_003");
    }

    const department = await tx.department.update({
      where: { id: departmentId },
      data: { status: DepartmentStatus.INACTIVE },
    });

    await logActivity(tx, {
      actorId: actorIdFrom(session),
      actionType: "DEPARTMENT_DEACTIVATED",
      targetEntityType: "Department",
      targetEntityId: department.id,
      description: `Deactivated department ${department.name}`,
      newValue: department,
    });

    return department;
  });
}

export async function createAssetCategory(input: z.input<typeof categoryInput>) {
  const session = await requireRole("ADMIN");
  const data = categoryInput.parse(input);

  return prisma.$transaction(async (tx) => {
    const category = await tx.assetCategory.create({
      data: {
        name: data.name,
        type: data.type ?? null,
        customFields: data.customFields ?? undefined,
      },
    });

    await logActivity(tx, {
      actorId: actorIdFrom(session),
      actionType: "ASSET_CATEGORY_CREATED",
      targetEntityType: "AssetCategory",
      targetEntityId: category.id,
      description: `Created asset category ${category.name}`,
      newValue: category,
    });

    return category;
  });
}

export async function updateAssetCategory(
  categoryId: string,
  input: z.input<typeof categoryInput>
) {
  const session = await requireRole("ADMIN");
  const data = categoryInput.parse(input);

  return prisma.$transaction(async (tx) => {
    const previous = await tx.assetCategory.findUniqueOrThrow({
      where: { id: categoryId },
    });
    const category = await tx.assetCategory.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        type: data.type ?? null,
        customFields: data.customFields ?? undefined,
      },
    });

    await logActivity(tx, {
      actorId: actorIdFrom(session),
      actionType: "ASSET_CATEGORY_UPDATED",
      targetEntityType: "AssetCategory",
      targetEntityId: category.id,
      description: `Updated asset category ${category.name}`,
      oldValue: previous,
      newValue: category,
    });

    return category;
  });
}

export async function setAssetCategoryActive(categoryId: string, isActive: boolean) {
  const session = await requireRole("ADMIN");

  return prisma.$transaction(async (tx) => {
    const category = await tx.assetCategory.update({
      where: { id: categoryId },
      data: { isActive },
    });

    await logActivity(tx, {
      actorId: actorIdFrom(session),
      actionType: isActive ? "ASSET_CATEGORY_ACTIVATED" : "ASSET_CATEGORY_DEACTIVATED",
      targetEntityType: "AssetCategory",
      targetEntityId: category.id,
      description: `${isActive ? "Activated" : "Deactivated"} asset category ${category.name}`,
      newValue: category,
    });

    return category;
  });
}

export async function updateEmployeeRole(input: z.input<typeof employeeRoleInput>) {
  const session = await requireRole("ADMIN");
  const data = employeeRoleInput.parse(input);

  if (data.role === "DEPARTMENT_HEAD" && !data.departmentId) {
    throw new Error("ORG_002");
  }

  return prisma.$transaction(async (tx) => {
    const previous = await tx.user.findUniqueOrThrow({
      where: { id: data.userId },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });

    if (previous.role === "DEPARTMENT_HEAD") {
      await tx.department.updateMany({
        where: { headId: previous.id },
        data: { headId: null },
      });
    }

    const user = await tx.user.update({
      where: { id: data.userId },
      data: {
        role: data.role,
        status: data.status ?? previous.status,
        departmentId: data.departmentId ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });

    if (data.role === "DEPARTMENT_HEAD" && data.departmentId) {
      const department = await tx.department.findUniqueOrThrow({
        where: { id: data.departmentId },
        select: { headId: true },
      });

      if (department.headId && department.headId !== user.id) {
        await tx.user.update({
          where: { id: department.headId },
          data: { role: "EMPLOYEE" },
        });
      }

      await tx.department.update({
        where: { id: data.departmentId },
        data: { headId: user.id },
      });
    }

    await logActivity(tx, {
      actorId: actorIdFrom(session),
      actionType: "EMPLOYEE_ROLE_UPDATED",
      targetEntityType: "User",
      targetEntityId: user.id,
      description: `Updated role for ${user.name}`,
      oldValue: previous,
      newValue: user,
    });

    return user;
  });
}
