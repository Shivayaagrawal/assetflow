import { DepartmentPolicy } from "@/modules/organization/policies/department.policy";
import { AssetCategoryRepository } from "@/modules/organization/repositories/asset-category.repository";
import type { AssetCategoryInput } from "@/modules/organization/validators/organization.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class UpdateAssetCategoryService {
  async execute(user: SessionUser, categoryId: string, input: AssetCategoryInput) {
    DepartmentPolicy.assertCanManage(user);

    return withTransaction(async (tx) => {
      const categoryRepo = new AssetCategoryRepository(tx);
      const previous = await categoryRepo.findByIdOrThrow(categoryId);
      const category = await categoryRepo.update(categoryId, {
        name: input.name,
        customFields: input.customFields ?? undefined,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "ASSET_CATEGORY_UPDATED",
        entityType: "AssetCategory",
        entityId: category.id,
        oldValue: previous,
        newValue: category,
      });

      return category;
    });
  }
}

export const updateAssetCategoryService = new UpdateAssetCategoryService();
