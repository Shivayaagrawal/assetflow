import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class DepartmentRepository {
  constructor(private readonly db: Tx = prisma) {}

  findById(id: string) {
    return this.db.department.findUnique({ where: { id } });
  }

  findAll() {
    return this.db.department.findMany({ orderBy: { name: "asc" } });
  }
}
