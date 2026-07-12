"use server";

import { decideTransferService } from "@/modules/allocation/services/decide-transfer.service";
import { requestTransferService } from "@/modules/allocation/services/request-transfer.service";
import { AllocationRepository } from "@/modules/allocation/repositories/allocation.repository";
import { TransferRequestRepository } from "@/modules/allocation/repositories/transfer-request.repository";
import {
  requestTransferSchema,
  transferDecisionSchema,
} from "@/modules/allocation/validators/transfer.schema";
import { UserRepository } from "@/modules/identity/repositories/user.repository";
import { assertDepartmentAccess, requireSessionUser } from "@/shared/auth/session";
import { AuthorizationError } from "@/shared/errors/app-error";
import { runAction } from "@/shared/validation/run-action";
import { throwOnFailure } from "@/shared/validation/unwrap-action";

export async function requestTransferAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = requestTransferSchema.parse(input);
    return requestTransferService.execute(user, data);
  });
}

export async function decideTransferAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = transferDecisionSchema.parse(input);
    return decideTransferService.execute(user, data);
  });
}

export async function requestTransfer(input: unknown) {
  return requestTransferAction(input);
}

export async function decideTransferRequest(input: unknown) {
  return throwOnFailure(await decideTransferAction(input));
}

export async function listMyAllocations() {
  const user = await requireSessionUser();
  return new AllocationRepository().findByHolder(user.id);
}

export async function listDepartmentPeers() {
  const user = await requireSessionUser();
  if (!user.departmentId) return [];
  assertDepartmentAccess(user, user.departmentId);
  return new UserRepository().findActivePeersInDepartment(user.departmentId, user.id);
}

export async function listPendingTransferApprovals(departmentId?: string) {
  const user = await requireSessionUser();
  const repo = new TransferRequestRepository();

  if (user.role === "ASSET_MANAGER" || user.role === "ADMIN") {
    if (departmentId) {
      assertDepartmentAccess(user, departmentId);
      return repo.listPendingByDepartment(departmentId);
    }
    return repo.listPendingAll();
  }

  if (user.role === "DEPARTMENT_HEAD") {
    if (!user.departmentId) {
      throw new AuthorizationError("AUTH_007");
    }
    assertDepartmentAccess(user, user.departmentId);
    return repo.listPendingByDepartment(user.departmentId);
  }

  throw new AuthorizationError("AUTH_007");
}
