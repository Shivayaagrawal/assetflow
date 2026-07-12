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

function departmentForAllocation(allocation: {
  holderDepartmentId: string | null;
  holderEmployee: { departmentId: string | null } | null;
}) {
  return (
    allocation.holderDepartmentId ?? allocation.holderEmployee?.departmentId ?? null
  );
}

async function loadTransferForDecision(transferRequestId: string) {
  return prisma.transferRequest.findUniqueOrThrow({
    where: { id: transferRequestId },
    include: {
      allocation: {
        include: {
          asset: true,
          holderEmployee: true,
          holderDepartment: true,
        },
      },
      fromEmployee: true,
      toEmployee: true,
    },
  });
}

export async function decideTransferRequest(
  input: z.input<typeof transferDecisionInput>
) {
  const session = await requireRole("DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN");
  const data = transferDecisionInput.parse(input);
  const actor = session.user;

  const transfer = await loadTransferForDecision(data.transferRequestId);
  const scopedDepartmentId = departmentForAllocation(transfer.allocation);

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
          resolvedAt: new Date(),
        },
      });

      await logActivity(tx, {
        actorId: actor.id,
        actionType: "TRANSFER_REJECTED",
        targetEntityType: "TransferRequest",
        targetEntityId: rejected.id,
        description: `Rejected transfer for ${transfer.allocation.asset.assetTag}`,
        oldValue: { status: transfer.status },
        newValue: { status: rejected.status },
      });

      return rejected;
    }

    await tx.allocation.update({
      where: { id: transfer.allocationId },
      data: {
        status: "RETURNED",
        actualReturnDate: new Date(),
      },
    });

    const newAllocation = await tx.allocation.create({
      data: {
        assetId: transfer.allocation.assetId,
        holderType: "EMPLOYEE",
        holderEmployeeId: transfer.toEmployeeId,
        status: "ACTIVE",
      },
    });

    const approved = await tx.transferRequest.update({
      where: { id: transfer.id },
      data: {
        status: "COMPLETED",
        approvedById: actor.id,
        resolvedAt: new Date(),
      },
    });

    await tx.asset.update({
      where: { id: transfer.allocation.assetId },
      data: { status: "ALLOCATED" },
    });

    await createNotification(tx, {
      recipientId: transfer.fromEmployeeId,
      type: "TRANSFER_APPROVED",
      message: `Transfer approved for ${transfer.allocation.asset.name}`,
      relatedEntityType: "TransferRequest",
      relatedEntityId: transfer.id,
    });

    await logActivity(tx, {
      actorId: actor.id,
      actionType: "TRANSFER_APPROVED",
      targetEntityType: "TransferRequest",
      targetEntityId: approved.id,
      description: `Approved transfer for ${transfer.allocation.asset.assetTag}`,
      oldValue: { status: transfer.status, allocationId: transfer.allocationId },
      newValue: { status: approved.status, allocationId: newAllocation.id },
    });

    return approved;
  });
}
