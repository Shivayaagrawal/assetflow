import { DepartmentPolicy } from "@/modules/organization/policies/department.policy";
import { AssetCategoryRepository } from "@/modules/organization/repositories/asset-category.repository";
import { DepartmentRepository } from "@/modules/organization/repositories/department.repository";
import { UserRepository } from "@/modules/identity/repositories/user.repository";
import { requireSessionUser } from "@/shared/auth/session";

export async function listDepartments(options?: { activeOnly?: boolean }) {
  await requireSessionUser();
  return new DepartmentRepository().list(options);
}

export async function listAssetCategories() {
  await requireSessionUser();
  return new AssetCategoryRepository().list();
}

export async function listEmployeeDirectory() {
  const user = await requireSessionUser();
  DepartmentPolicy.assertCanManage(user);
  return new UserRepository().listDirectory();
}
