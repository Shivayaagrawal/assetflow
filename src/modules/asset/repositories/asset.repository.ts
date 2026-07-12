import type { Asset, AssetStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class AssetRepository {
  constructor(private readonly db: Tx = prisma) {}

  findById(id: string) {
    return this.db.asset.findUnique({ where: { id } });
  }

  findBySerial(serialNumber: string) {
    return this.db.asset.findUnique({ where: { serialNumber } });
  }

  create(data: Prisma.AssetCreateInput) {
    return this.db.asset.create({ data });
  }

  updateStatus(id: string, status: AssetStatus) {
    return this.db.asset.update({ where: { id }, data: { status } });
  }

  count() {
    return this.db.asset.count();
  }

  async nextAssetTag(): Promise<string> {
    const count = await this.count();
    return `AF-${String(count + 1).padStart(4, "0")}`;
  }
}

export type AssetEntity = Asset;
