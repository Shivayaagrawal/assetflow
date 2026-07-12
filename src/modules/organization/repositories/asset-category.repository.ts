import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class AssetCategoryRepository {
  constructor(private readonly db: Tx = prisma) {}

  list() {
    return this.db.assetCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        customFields: true,
        _count: { select: { assets: true } },
      },
    });
  }

  create(data: Prisma.AssetCategoryCreateInput) {
    return this.db.assetCategory.create({ data });
  }

  findByIdOrThrow(id: string) {
    return this.db.assetCategory.findUniqueOrThrow({ where: { id } });
  }

  update(id: string, data: Prisma.AssetCategoryUpdateInput) {
    return this.db.assetCategory.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.db.assetCategory.delete({ where: { id } });
  }

  countActiveAssets(categoryId: string) {
    return this.db.asset.count({
      where: {
        categoryId,
        status: { notIn: ["RETIRED", "DISPOSED"] },
      },
    });
  }
}
