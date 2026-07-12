import type { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/shared/database";

type Tx = Prisma.TransactionClient | typeof prisma;

export class UserRepository {
  constructor(private readonly db: Tx = prisma) {}

  findById(id: string) {
    return this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });
  }

  findByIdOrThrow(id: string) {
    return this.db.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });
  }

  listDirectory() {
    return this.db.user.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
  }

  findActivePeersInDepartment(departmentId: string, excludeUserId: string) {
    return this.db.user.findMany({
      where: {
        departmentId,
        status: "ACTIVE",
        id: { not: excludeUserId },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
  }

  findActiveManagers() {
    return this.db.user.findMany({
      where: {
        role: { in: ["ASSET_MANAGER", "ADMIN"] },
        status: "ACTIVE",
      },
      select: { id: true },
    });
  }

  updateRoleAndStatus(
    userId: string,
    data: {
      role: UserRole;
      status: UserStatus;
      departmentId: string | null;
    }
  ) {
    return this.db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
      },
    });
  }

  deactivate(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { status: "INACTIVE" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });
  }

  demoteToEmployee(userId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: { role: "EMPLOYEE" },
    });
  }

  promoteDepartmentHead(userId: string, departmentId: string) {
    return this.db.user.update({
      where: { id: userId },
      data: {
        role: "DEPARTMENT_HEAD",
        departmentId,
        status: "ACTIVE",
      },
    });
  }
}
