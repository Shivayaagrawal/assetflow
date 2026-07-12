"use server";

import { closeAuditCycleService } from "@/modules/audit/services/close-audit-cycle.service";
import { createAuditCycleService } from "@/modules/audit/services/create-audit-cycle.service";
import { verifyAssetService } from "@/modules/audit/services/verify-asset.service";
import { AuditRepository } from "@/modules/audit/repositories/audit.repository";
import {
  closeAuditCycleSchema,
  createAuditCycleSchema,
  verifyAssetSchema,
} from "@/modules/audit/validators/audit.schema";
import { requireSessionUser } from "@/shared/auth/session";
import { runAction } from "@/shared/validation/run-action";
import { throwOnFailure } from "@/shared/validation/unwrap-action";

export async function createAuditCycleAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = createAuditCycleSchema.parse(input);
    return createAuditCycleService.execute(user, data);
  });
}

export async function verifyAssetAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = verifyAssetSchema.parse(input);
    return verifyAssetService.execute(user, data);
  });
}

export async function closeAuditCycleAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = closeAuditCycleSchema.parse(input);
    return closeAuditCycleService.execute(user, data);
  });
}

export async function createAuditCycle(input: unknown) {
  return throwOnFailure(await createAuditCycleAction(input));
}

export async function verifyAsset(input: unknown) {
  return throwOnFailure(await verifyAssetAction(input));
}

export async function closeAuditCycle(input: unknown) {
  return throwOnFailure(await closeAuditCycleAction(input));
}

export async function listAuditCycles() {
  await requireSessionUser();
  return new AuditRepository().listOpen();
}

export async function listClosedAuditCycles() {
  await requireSessionUser();
  return new AuditRepository().listClosed();
}

export async function getAuditCycle(cycleId: string) {
  await requireSessionUser();
  return new AuditRepository().findByIdOrThrow(cycleId);
}

export async function listAuditorCandidates() {
  const user = await requireSessionUser();
  const { prisma } = await import("@/shared/database");
  return prisma.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["EMPLOYEE", "DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"] },
      ...(user.role === "DEPARTMENT_HEAD" && user.departmentId
        ? { departmentId: user.departmentId }
        : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}
