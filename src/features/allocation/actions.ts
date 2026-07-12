"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createNotification } from "@/features/notifications/create-notification";
import { logActivity } from "@/features/activity-log/log-activity";

const transferDecisionInput = z.object({
  transferRequestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

function departmentForTransfer(
  transfer: Awaited<ReturnType<typeof loadTransferForDecision>>,
  toEmployeeDepartmentId?: string | null
) {
  return (
    transfer.fromAllocation.departmentId ??
    transfer.fromAllocation.employee?.departmentId ??
    transfer.toDepartmentId ??
    toEmployeeDepartmentId ??
    null
  );
}

async function loadTransferForDecision(transferRequestId: string) {
  return prisma.transferRequest.findUniqueOrThrow({
    where: { id: transferRequestId },
    include: {
      asset: true,
      requestedBy: true,
      fromAllocation: {
        include: {
          employee: true,
          department: true,
        },
      },
    },
  });
}

export async function decideTransferRequest(
  input: z.input<typeof transferDecisionInput>
) {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const data = transferDecisionInput.parse(input);
  const actor = session.user as {
    id: string;
    role?: string;
    departmentId?: string | null;
  };

  const transfer = await loadTransferForDecision(data.transferRequestId);
  const toEmployee = transfer.toEmployeeId
    ? await prisma.user.findUnique({
        where: { id: transfer.toEmployeeId },
        select: { id: true, departmentId: true },
      })
    : null;
  const scopedDepartmentId = departmentForTransfer(transfer, toEmployee?.departmentId);

  if (
    actor.role === "DEPARTMENT_HEAD" &&
    (!scopedDepartmentId || actor.departmentId !== scopedDepartmentId)
  ) {
    throw new Error("FORBIDDEN");
  }

  if (transfer.status !== "REQUESTED") {
    throw new Error("ALLOC_004");
  }

  return prisma.$transaction(async (tx) => {
    if (data.decision === "REJECTED") {
      const rejected = await tx.transferRequest.update({
        where: { id: transfer.id },
        data: {
          status: "REJECTED",
          approvedById: actor.id,
        },
      });

      await logActivity(tx, {
        actorId: actor.id,
        actionType: "TRANSFER_REJECTED",
        targetEntityType: "TransferRequest",
        targetEntityId: rejected.id,
        description: `Rejected transfer for ${transfer.asset.assetTag}`,
        oldValue: { status: transfer.status },
        newValue: { status: rejected.status },
      });

      return rejected;
    }

    await tx.allocation.update({
      where: { id: transfer.fromAllocationId },
      data: {
        status: "RETURNED",
        actualReturnDate: new Date(),
      },
    });

    const newAllocation = await tx.allocation.create({
      data: {
        assetId: transfer.assetId,
        holderType: transfer.toDepartmentId ? "DEPARTMENT" : "EMPLOYEE",
        employeeId: transfer.toEmployeeId,
        departmentId: transfer.toDepartmentId,
        status: "ACTIVE",
      },
    });

    const approved = await tx.transferRequest.update({
      where: { id: transfer.id },
      data: {
        status: "COMPLETED",
        approvedById: actor.id,
      },
    });

    await tx.asset.update({
      where: { id: transfer.assetId },
      data: { status: "ALLOCATED" },
    });

    await createNotification(tx, {
      recipientId: transfer.requestedById,
      type: "TRANSFER_APPROVED",
      message: `Transfer approved for ${transfer.asset.name}`,
      relatedEntityType: "TransferRequest",
      relatedEntityId: transfer.id,
    });

    await logActivity(tx, {
      actorId: actor.id,
      actionType: "TRANSFER_APPROVED",
      targetEntityType: "TransferRequest",
      targetEntityId: approved.id,
      description: `Approved transfer for ${transfer.asset.assetTag}`,
      oldValue: { status: transfer.status, allocationId: transfer.fromAllocationId },
      newValue: { status: approved.status, allocationId: newAllocation.id },
    });

    return approved;
  });
}
