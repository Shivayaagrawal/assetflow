import type { DepartmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class DepartmentRepository {
  constructor(private readonly db: Tx = prisma) {}

  findById(id: string) {
    return this.db.department.findUnique({ where: { id } });
  }

  findByIdOrThrow(id: string) {
    return this.db.department.findUniqueOrThrow({ where: { id } });
  }

  list(options?: { activeOnly?: boolean }) {
    return this.db.department.findMany({
      where: options?.activeOnly ? { status: "ACTIVE" } : undefined,
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
        parentId: true,
        head: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, children: true, allocations: true } },
      },
    });
  }

  create(data: { name: string; parentId: string | null; headId: string | null }) {
    return this.db.department.create({
      data: {
        name: data.name,
        parentId: data.parentId,
        headId: data.headId,
      },
    });
  }

  update(
    id: string,
    data: { name: string; parentId: string | null; headId: string | null }
  ) {
    return this.db.department.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId,
        headId: data.headId,
      },
    });
  }

  deactivate(id: string) {
    return this.db.department.update({
      where: { id },
      data: { status: "INACTIVE" satisfies DepartmentStatus },
    });
  }

  countActiveMembers(departmentId: string) {
    return this.db.user.count({
      where: { departmentId, status: "ACTIVE" },
    });
  }

  clearHead(userId: string) {
    return this.db.department.updateMany({
      where: { headId: userId },
      data: { headId: null },
    });
  }

  assignHead(departmentId: string, headId: string) {
    return this.db.department.update({
      where: { id: departmentId },
      data: { headId },
    });
  }

  findHeadId(departmentId: string) {
    return this.db.department.findUnique({
      where: { id: departmentId },
      select: { headId: true },
    });
  }
}
