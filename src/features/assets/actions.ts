"use server";

import { registerAssetAction } from "@/modules/asset/actions/register-asset.action";

type RegisterAssetResult =
  | {
      success: true;
      data: {
        assetId: string;
        assetTag: string;
      };
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
    };

export async function registerAsset(input: unknown): Promise<RegisterAssetResult> {
  const result = await registerAssetAction(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: result.error.code,
        message: result.error.message,
      },
    };
  }

  return {
    success: true,
    data: {
      assetId: result.data.id,
      assetTag: result.data.assetTag,
    },
  };
}
