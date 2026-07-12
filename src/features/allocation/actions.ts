"use server";

import {
  AllocationStatus,
  AssetStatus,
  HolderType,
  UserStatus,
} from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { createNotification } from "@/features/notifications/create-notification";
import { logActivity } from "@/features/activity-log/log-activity";
import {
  allocateAssetSchema,
  returnAssetSchema,
  type AllocateAssetInput,
  type ReturnAssetInput,
} from "./schemas";

type AllocationActionResult =
  | {
      success: true;
      data: {
        allocationId: string;
      };
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
    };

const transferDecisionInput = z.object({
  transferRequestId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function authError(error: unknown): AllocationActionResult | null {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return {
      success: false,
      error: {
        code: "AUTH_002",
        message: "You must be signed in to manage allocations",
      },
    };
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return {
      success: false,
      error: {
        code: "AUTH_007",
        message: "Only Asset Managers can manage allocations",
      },
    };
  }

  return null;
}

export async function allocateAsset(
  input: AllocateAssetInput
): Promise<AllocationActionResult> {
  const parsed = allocateAssetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "GEN_001",
        message: parsed.error.issues[0]?.message ?? "Validation failed",
      },
    };
  }

  if (parsed.data.holderType !== HolderType.EMPLOYEE) {
    return {
      success: false,
      error: {
        code: "ALLOC_007",
        message: "Only employee allocations are supported in this milestone",
      },
    };
  }

  if (
    parsed.data.expectedReturnDate &&
    parsed.data.expectedReturnDate < startOfToday()
  ) {
    return {
      success: false,
      error: {
        code: "ALLOC_006",
        message: "Expected return date cannot be in the past",
      },
    };
  }

  try {
    await requireRole("ASSET_MANAGER");

    return await prisma.$transaction(async (tx) => {
      const [asset, employee] = await Promise.all([
        tx.asset.findUnique({
          where: { id: parsed.data.assetId },
          select: {
            id: true,
            status: true,
            allocations: {
              where: { status: AllocationStatus.ACTIVE },
              select: { id: true },
              take: 1,
            },
          },
        }),
        tx.user.findUnique({
          where: { id: parsed.data.employeeId },
          select: {
            id: true,
            status: true,
          },
        }),
      ]);

      if (!asset) {
        return {
          success: false,
          error: {
            code: "ASSET_001",
            message: "Asset not found",
          },
        };
      }

      if (!employee || employee.status !== UserStatus.ACTIVE) {
        return {
          success: false,
          error: {
            code: "ALLOC_005",
            message: "Employee not found or inactive",
          },
        };
      }

      if (asset.allocations.length > 0) {
        return {
          success: false,
          error: {
            code: "ALLOC_002",
            message: "This asset is currently allocated.",
          },
        };
      }

      if (asset.status !== AssetStatus.AVAILABLE) {
        return {
          success: false,
          error: {
            code: "ALLOC_002",
            message: "Only available assets can be allocated",
          },
        };
      }

      const allocation = await tx.allocation.create({
        data: {
          assetId: parsed.data.assetId,
          holderType: HolderType.EMPLOYEE,
          holderEmployeeId: parsed.data.employeeId,
          expectedReturnDate: parsed.data.expectedReturnDate,
          status: AllocationStatus.ACTIVE,
        },
        select: { id: true },
      });

      await tx.asset.update({
        where: { id: parsed.data.assetId },
        data: { status: AssetStatus.ALLOCATED },
      });

      return {
        success: true,
        data: {
          allocationId: allocation.id,
        },
      };
    });
  } catch (error) {
    const knownAuthError = authError(error);
    if (knownAuthError) return knownAuthError;

    return {
      success: false,
      error: {
        code: "GEN_003",
        message: "Unable to allocate asset",
      },
    };
  }
}

export async function returnAsset(
  input: ReturnAssetInput
): Promise<AllocationActionResult> {
  const parsed = returnAssetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "GEN_001",
        message: parsed.error.issues[0]?.message ?? "Validation failed",
      },
    };
  }

  try {
    await requireRole("ASSET_MANAGER");

    return await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({
        where: { id: parsed.data.allocationId },
        select: {
          id: true,
          assetId: true,
          status: true,
        },
      });

      if (!allocation) {
        return {
          success: false,
          error: {
            code: "ALLOC_001",
            message: "Allocation not found",
          },
        };
      }

      if (allocation.status !== AllocationStatus.ACTIVE) {
        return {
          success: false,
          error: {
            code: "ALLOC_003",
            message: "Allocation has already been returned",
          },
        };
      }

      await tx.allocation.update({
        where: { id: allocation.id },
        data: {
          status: parsed.data.status,
          actualReturnDate: new Date(),
        },
      });

      await tx.asset.update({
        where: { id: allocation.assetId },
        data: { status: AssetStatus.AVAILABLE },
      });

      return {
        success: true,
        data: {
          allocationId: allocation.id,
        },
      };
    });
  } catch (error) {
    const knownAuthError = authError(error);
    if (knownAuthError) return knownAuthError;

    return {
      success: false,
      error: {
        code: "GEN_003",
        message: "Unable to return asset",
      },
    };
  }
}

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
