"use server";

import { createAssetCategoryService } from "@/modules/organization/services/create-asset-category.service";
import { createDepartmentService } from "@/modules/organization/services/create-department.service";
import { deactivateCategoryService } from "@/modules/organization/services/deactivate-category.service";
import { deactivateDepartmentService } from "@/modules/organization/services/deactivate-department.service";
import { updateAssetCategoryService } from "@/modules/organization/services/update-asset-category.service";
import { updateDepartmentService } from "@/modules/organization/services/update-department.service";
import {
  assetCategorySchema,
  departmentSchema,
} from "@/modules/organization/validators/organization.schema";
import { requireSessionUser } from "@/shared/auth/session";
import { runAction } from "@/shared/validation/run-action";
import { throwOnFailure } from "@/shared/validation/unwrap-action";

export async function createDepartmentAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = departmentSchema.parse(input);
    return createDepartmentService.execute(user, data);
  });
}

export async function updateDepartmentAction(departmentId: string, input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = departmentSchema.parse(input);
    return updateDepartmentService.execute(user, departmentId, data);
  });
}

export async function deactivateDepartmentAction(departmentId: string) {
  return runAction(async () => {
    const user = await requireSessionUser();
    return deactivateDepartmentService.execute(user, departmentId);
  });
}

export async function createAssetCategoryAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = assetCategorySchema.parse(input);
    return createAssetCategoryService.execute(user, data);
  });
}

export async function updateAssetCategoryAction(categoryId: string, input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = assetCategorySchema.parse(input);
    return updateAssetCategoryService.execute(user, categoryId, data);
  });
}

export async function deactivateCategoryAction(categoryId: string) {
  return runAction(async () => {
    const user = await requireSessionUser();
    return deactivateCategoryService.execute(user, categoryId);
  });
}

/** Form-friendly wrappers that throw AppError on failure. */
export async function createDepartment(input: unknown) {
  return throwOnFailure(await createDepartmentAction(input));
}

export async function updateDepartment(departmentId: string, input: unknown) {
  return throwOnFailure(await updateDepartmentAction(departmentId, input));
}

export async function deactivateDepartment(departmentId: string) {
  return throwOnFailure(await deactivateDepartmentAction(departmentId));
}

export async function createAssetCategory(input: unknown) {
  return throwOnFailure(await createAssetCategoryAction(input));
}

export async function updateAssetCategory(categoryId: string, input: unknown) {
  return throwOnFailure(await updateAssetCategoryAction(categoryId, input));
}

export async function deactivateCategory(categoryId: string) {
  return throwOnFailure(await deactivateCategoryAction(categoryId));
}
