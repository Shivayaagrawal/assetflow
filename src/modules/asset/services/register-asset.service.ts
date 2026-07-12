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
        ...(input.departmentId
          ? { department: { connect: { id: input.departmentId } } }
          : {}),
        acquisitionDate: input.acquisitionDate,
        acquisitionCost: input.acquisitionCost,
        location: input.location,
        isBookable: input.isBookable,
        imageUrl: input.imageUrl,
        status: "AVAILABLE",
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "ASSET_REGISTERED",
        entityType: "Asset",
        entityId: asset.id,
        newValue: {
          description: `${user.name} registered ${asset.assetTag} · ${asset.name}`,
          assetTag: asset.assetTag,
          name: asset.name,
          status: asset.status,
        },
      });

      return asset;
    });
  }
}

export const registerAssetService = new RegisterAssetService();
