import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { decideTransferService } from "@/modules/allocation/services/decide-transfer.service";
import { ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { AllocationStatus, TransferStatus } from "@prisma/client";

describe("decideTransferService concurrency integration", () => {
  const runId = Date.now().toString(36);
  let categoryId = "";
  let assetId = "";
  let departmentId = "";
  let user1Id = "";
  let user2Id = "";
  let headUser: SessionUser;
  let allocationId = "";

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `Concurrency Dept ${runId}`, status: "ACTIVE" },
    });
    departmentId = dept.id;

    const category = await prisma.assetCategory.create({
      data: { name: `Concurrency Category ${runId}` },
    });
    categoryId = category.id;

    const asset = await prisma.asset.create({
      data: {
        name: "Concurrency Asset",
        assetTag: `AF-CNC-${runId}`,
        serialNumber: `SN-CNC-${runId}`,
        categoryId,
        status: "AVAILABLE",
        isBookable: false,
        location: "Bengaluru",
      },
    });
    assetId = asset.id;

    const user1 = await prisma.user.create({
      data: {
        name: "User One",
        email: `u1-${runId}@assetflow.demo`,
        role: "EMPLOYEE",
        status: "ACTIVE",
        departmentId,
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        name: "User Two",
        email: `u2-${runId}@assetflow.demo`,
        role: "EMPLOYEE",
        status: "ACTIVE",
        departmentId,
      },
    });
    user2Id = user2.id;

    const head = await prisma.user.create({
      data: {
        name: "Head User",
        email: `head-${runId}@assetflow.demo`,
        role: "DEPARTMENT_HEAD",
        status: "ACTIVE",
        departmentId,
      },
    });
    headUser = {
      id: head.id,
      name: head.name,
      email: head.email,
      role: head.role,
      status: head.status,
      departmentId: head.departmentId,
    };
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({
      where: { recipientId: { in: [user1Id, user2Id, headUser.id] } },
    });
    await prisma.activityLog.deleteMany({
      where: { actorId: { in: [user1Id, user2Id, headUser.id] } },
    });
    await prisma.transferRequest.deleteMany({
      where: { toEmployeeId: user2Id },
    });
    await prisma.allocation.deleteMany({
      where: { assetId },
    });
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => undefined);
    await prisma.user.deleteMany({
      where: { id: { in: [user1Id, user2Id, headUser.id] } },
    });
    await prisma.department.delete({ where: { id: departmentId } }).catch(() => undefined);
    await prisma.assetCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  async function setupRequestedTransfer() {
    await prisma.transferRequest.deleteMany({ where: { toEmployeeId: user2Id } });
    await prisma.allocation.deleteMany({ where: { assetId } });

    const allocation = await prisma.allocation.create({
      data: {
        assetId,
        holderType: "EMPLOYEE",
        holderEmployeeId: user1Id,
        status: AllocationStatus.ACTIVE,
      },
    });
    allocationId = allocation.id;

    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "ALLOCATED" },
    });

    const transfer = await prisma.transferRequest.create({
      data: {
        allocationId: allocation.id,
        fromEmployeeId: user1Id,
        toEmployeeId: user2Id,
        status: TransferStatus.REQUESTED,
      },
    });

    return transfer;
  }

  it("handles concurrent approvals of the same request exactly once", async () => {
    const transfer = await setupRequestedTransfer();

    const promises = [
      decideTransferService.execute(headUser, {
        transferRequestId: transfer.id,
        decision: "APPROVED",
      }),
      decideTransferService.execute(headUser, {
        transferRequestId: transfer.id,
        decision: "APPROVED",
      }),
    ];

    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const error = (rejected[0] as PromiseRejectedResult).reason;
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).code).toBe("ALLOC_004");

    const dbTransfer = await prisma.transferRequest.findUnique({
      where: { id: transfer.id },
    });
    expect(dbTransfer?.status).toBe("COMPLETED");

    const activeAllocations = await prisma.allocation.findMany({
      where: { assetId, status: "ACTIVE" },
    });
    expect(activeAllocations.length).toBe(1);
    expect(activeAllocations[0].holderEmployeeId).toBe(user2Id);

    const historyRowsCount = await prisma.activityLog.count({
      where: {
        action: "TRANSFER_APPROVED",
        entityType: "TransferRequest",
        entityId: transfer.id,
      },
    });
    expect(historyRowsCount).toBe(1);

    const notificationCount = await prisma.notification.count({
      where: {
        relatedEntityType: "TransferRequest",
        relatedEntityId: transfer.id,
        type: "TRANSFER_APPROVED",
      },
    });
    expect(notificationCount).toBe(1);
  });

  it("handles concurrent approval and rejection of the same request exactly once", async () => {
    const transfer = await setupRequestedTransfer();

    const promises = [
      decideTransferService.execute(headUser, {
        transferRequestId: transfer.id,
        decision: "APPROVED",
      }),
      decideTransferService.execute(headUser, {
        transferRequestId: transfer.id,
        decision: "REJECTED",
      }),
    ];

    const results = await Promise.allSettled(promises);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const error = (rejected[0] as PromiseRejectedResult).reason;
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).code).toBe("ALLOC_004");

    const dbTransfer = await prisma.transferRequest.findUnique({
      where: { id: transfer.id },
    });
    const winnerDecision = (fulfilled[0] as PromiseFulfilledResult<any>).value.status;
    expect(dbTransfer?.status).toBe(winnerDecision);

    if (winnerDecision === "COMPLETED") {
      const activeAllocations = await prisma.allocation.findMany({
        where: { assetId, status: "ACTIVE" },
      });
      expect(activeAllocations.length).toBe(1);
      expect(activeAllocations[0].holderEmployeeId).toBe(user2Id);
    } else {
      const activeAllocations = await prisma.allocation.findMany({
        where: { assetId, status: "ACTIVE" },
      });
      expect(activeAllocations.length).toBe(1);
      expect(activeAllocations[0].holderEmployeeId).toBe(user1Id);
    }
  });
});
