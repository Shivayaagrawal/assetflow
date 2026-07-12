import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class SessionRepository {
  constructor(private readonly db: Tx = prisma) {}

  deleteByUserId(userId: string) {
    return this.db.session.deleteMany({ where: { userId } });
  }
}
