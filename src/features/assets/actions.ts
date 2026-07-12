"use server";

import { AssetStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { registerAssetSchema } from "./schemas";

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

const ASSET_TAG_PREFIX = "AF-";
const ASSET_TAG_WIDTH = 4;

function buildAssetTag(sequence: number) {
  return `${ASSET_TAG_PREFIX}${sequence.toString().padStart(ASSET_TAG_WIDTH, "0")}`;
}

async function generateAssetTag() {
  const latestAsset = await prisma.asset.findFirst({
    where: {
      assetTag: {
        startsWith: ASSET_TAG_PREFIX,
      },
    },
    orderBy: {
      assetTag: "desc",
    },
    select: {
      assetTag: true,
    },
  });

  const latestNumber = latestAsset?.assetTag.match(/^AF-(\d+)$/)?.[1];
  return buildAssetTag(latestNumber ? Number(latestNumber) + 1 : 1);
}

function mapPrismaError(error: unknown): RegisterAssetResult {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : String(error.meta?.target ?? "");

      if (target.includes("serialNumber")) {
        return {
          success: false,
          error: {
            code: "ASSET_002",
            message: "Serial number already exists",
          },
        };
      }

      if (target.includes("assetTag")) {
        return {
          success: false,
          error: {
            code: "ASSET_010",
            message:
              "Asset tag conflict detected. Please try again after refreshing the form.",
          },
        };
      }
    }

    if (error.code === "P2003") {
      return {
        success: false,
        error: {
          code: "ORG_007",
          message: "Selected asset category is invalid",
        },
      };
    }
  }

  return {
    success: false,
    error: {
      code: "GEN_003",
      message: "Unable to register asset",
    },
  };
}

export async function registerAsset(input: unknown): Promise<RegisterAssetResult> {
  const parsed = registerAssetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "GEN_001",
        message: parsed.error.issues[0]?.message ?? "Validation failed",
      },
    };
  }

  try {
    await requireRole("ASSET_MANAGER");

    const category = await prisma.assetCategory.findFirst({
      where: {
        id: parsed.data.categoryId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      return {
        success: false,
        error: {
          code: "ORG_007",
          message: "Selected asset category is invalid or inactive",
        },
      };
    }

    const assetTag = await generateAssetTag();
    const asset = await prisma.asset.create({
      data: {
        name: parsed.data.name,
        assetTag,
        serialNumber: parsed.data.serialNumber,
        categoryId: parsed.data.categoryId,
        acquisitionDate: parsed.data.acquisitionDate,
        acquisitionCost: parsed.data.acquisitionCost,
        condition: parsed.data.condition,
        location: parsed.data.location,
        photoUrl: parsed.data.photoUrl,
        isBookable: parsed.data.isBookable,
        status: AssetStatus.AVAILABLE,
      },
      select: {
        id: true,
        assetTag: true,
      },
    });

    return {
      success: true,
      data: {
        assetId: asset.id,
        assetTag: asset.assetTag,
      },
    };
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return {
        success: false,
        error: {
          code: "AUTH_002",
          message: "You must be signed in to register assets",
        },
      };
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return {
        success: false,
        error: {
          code: "AUTH_007",
          message: "Only Asset Managers can register assets",
        },
      };
    }

    return mapPrismaError(error);
  }
}
