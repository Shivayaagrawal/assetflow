import type { Asset, AssetStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export function formatAssetTag(sequenceValue: number | bigint): string {
  return `AF-${String(sequenceValue).padStart(6, "0")}`;
}

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

  async nextAssetTag(): Promise<string> {
    const rows = await this.db.$queryRaw<[{ nextval: bigint }]>`
      SELECT nextval('asset_tag_seq') AS nextval
    `;
    return formatAssetTag(rows[0].nextval);
  }
}

export type AssetEntity = Asset;
