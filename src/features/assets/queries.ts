import { prisma } from "@/lib/db";

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
