import { DepartmentPolicy } from "@/modules/organization/policies/department.policy";
import { AssetCategoryRepository } from "@/modules/organization/repositories/asset-category.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class DeactivateCategoryService {
  async execute(user: SessionUser, categoryId: string) {
    DepartmentPolicy.assertCanManage(user);

    return withTransaction(async (tx) => {
      const categoryRepo = new AssetCategoryRepository(tx);
      const activeAssets = await categoryRepo.countActiveAssets(categoryId);

      if (activeAssets > 0) {
        throw new ConflictError("ORG_004");
      }

      const category = await categoryRepo.delete(categoryId);

      await logActivity(tx, {
        actorId: user.id,
        action: "ASSET_CATEGORY_DEACTIVATED",
        entityType: "AssetCategory",
        entityId: category.id,
        oldValue: category,
      });

      return category;
    });
  }
}

export const deactivateCategoryService = new DeactivateCategoryService();
