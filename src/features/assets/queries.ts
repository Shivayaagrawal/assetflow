import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  assetDetailInputSchema,
  assetDirectoryFilterSchema,
  type AssetDirectoryFilters,
} from "./schemas";

export async function getAssetRegistrationCategories() {
  return prisma.assetCategory.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      type: true,
    },
  });
}

export async function listAssets(filters: AssetDirectoryFilters = {}) {
  await requireSession();
  const parsed = assetDirectoryFilterSchema.parse(filters);
  const search = parsed.search;
  const orderBy =
    parsed.sortBy === "name"
      ? { name: parsed.sortDirection }
      : { assetTag: parsed.sortDirection };

  return prisma.asset.findMany({
    where: {
      status: parsed.status,
      categoryId: parsed.categoryId,
      location: parsed.location,
      OR: search
        ? [
            { assetTag: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { serialNumber: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy,
    select: {
      id: true,
      assetTag: true,
      name: true,
      status: true,
      condition: true,
      location: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getAssetDirectoryFilters() {
  await requireSession();

  const [categories, locations] = await Promise.all([
    prisma.assetCategory.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.asset.findMany({
      distinct: ["location"],
      orderBy: {
        location: "asc",
      },
      select: {
        location: true,
      },
    }),
  ]);

  return {
    categories,
    locations: locations.map((asset) => asset.location).filter(Boolean),
  };
}

export async function getAssetDetail(input: unknown) {
  await requireSession();
  const parsed = assetDetailInputSchema.parse(input);

  return prisma.asset.findUnique({
    where: {
      id: parsed.assetId,
    },
    select: {
      id: true,
      assetTag: true,
      name: true,
      serialNumber: true,
      acquisitionDate: true,
      acquisitionCost: true,
      condition: true,
      location: true,
      status: true,
      isBookable: true,
      photoUrl: true,
      category: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  });
}
