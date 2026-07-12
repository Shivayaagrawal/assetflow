import { AssetPolicy } from "@/modules/asset/policies/asset.policy";
import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import type { RegisterAssetInput } from "@/modules/asset/validators/register-asset.schema";
import { ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";
import { logActivity } from "@/modules/activity/services/log-activity.service";

export class RegisterAssetService {
  constructor(private readonly assets = new AssetRepository()) {}

  async execute(user: SessionUser, input: RegisterAssetInput) {
    AssetPolicy.assertCanRegister(user);

    const existing = await this.assets.findBySerial(input.serialNumber);
    if (existing) {
      throw new ConflictError("ASSET_002");
    }

    return withTransaction(async (tx) => {
      const repo = new AssetRepository(tx);
      const assetTag = await repo.nextAssetTag();

      const asset = await repo.create({
        name: input.name,
        assetTag,
        serialNumber: input.serialNumber,
        category: { connect: { id: input.categoryId } },
        acquisitionDate: input.acquisitionDate,
        acquisitionCost: input.acquisitionCost,
        condition: input.condition,
        location: input.location,
        isBookable: input.isBookable,
        status: "AVAILABLE",
      });

      await logActivity(tx, {
        actorId: user.id,
        actionType: "ASSET_REGISTERED",
        targetEntityType: "Asset",
        targetEntityId: asset.id,
        description: `${asset.assetTag} registered`,
        newValue: { status: asset.status },
      });

      return asset;
    });
  }
}

export const registerAssetService = new RegisterAssetService();
