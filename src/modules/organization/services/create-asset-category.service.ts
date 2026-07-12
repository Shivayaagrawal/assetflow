import { DepartmentPolicy } from "@/modules/organization/policies/department.policy";
import { AssetCategoryRepository } from "@/modules/organization/repositories/asset-category.repository";
import type { AssetCategoryInput } from "@/modules/organization/validators/organization.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class CreateAssetCategoryService {
  async execute(user: SessionUser, input: AssetCategoryInput) {
    DepartmentPolicy.assertCanManage(user);

    return withTransaction(async (tx) => {
      const categoryRepo = new AssetCategoryRepository(tx);
      const category = await categoryRepo.create({
        name: input.name,
        customFields: input.customFields ?? undefined,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "ASSET_CATEGORY_CREATED",
        entityType: "AssetCategory",
        entityId: category.id,
        newValue: category,
      });

      return category;
    });
  }
}

export const createAssetCategoryService = new CreateAssetCategoryService();
