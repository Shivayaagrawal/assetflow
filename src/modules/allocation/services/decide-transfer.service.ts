import { AllocationPolicy } from "@/modules/allocation/policies/allocation.policy";
import { AllocationRepository } from "@/modules/allocation/repositories/allocation.repository";
import { TransferRequestRepository } from "@/modules/allocation/repositories/transfer-request.repository";
import type { TransferDecisionInput } from "@/modules/allocation/validators/transfer.schema";
import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { createNotification } from "@/modules/notification/services/create-notification.service";
import { ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

function departmentForAllocation(allocation: {
  holderDepartmentId: string | null;
  holderEmployee: { departmentId: string | null } | null;
}) {
  return allocation.holderDepartmentId ?? allocation.holderEmployee?.departmentId ?? null;
}

export class DecideTransferService {
  async execute(user: SessionUser, input: TransferDecisionInput) {
    const transfer = await new TransferRequestRepository().findByIdOrThrow(
      input.transferRequestId
    );
    const scopedDepartmentId = departmentForAllocation(transfer.allocation);

    AllocationPolicy.assertCanDecideTransfer(user, scopedDepartmentId);

    if (transfer.status !== "REQUESTED") {
      throw new ConflictError("ALLOC_004");
    }

    return withTransaction(async (tx) => {
      const transferRepo = new TransferRequestRepository(tx);
      const allocRepo = new AllocationRepository(tx);
      const assetRepo = new AssetRepository(tx);

      const latest = await transferRepo.findByIdOrThrow(transfer.id);
      if (latest.status !== "REQUESTED") {
        throw new ConflictError("ALLOC_004");
      }

      if (input.decision === "REJECTED") {
        const rejected = await transferRepo.reject(transfer.id, user.id);

        await logActivity(tx, {
          actorId: user.id,
          action: "TRANSFER_REJECTED",
          entityType: "TransferRequest",
          entityId: rejected.id,
          oldValue: { status: transfer.status },
          newValue: { status: rejected.status },
        });

        return rejected;
      }

      await allocRepo.close(transfer.allocationId, new Date());

      const newAllocation = await allocRepo.create({
        asset: { connect: { id: transfer.allocation.assetId } },
        holderType: "EMPLOYEE",
        holderEmployee: { connect: { id: transfer.toEmployeeId } },
        status: "ACTIVE",
      });

      const approved = await transferRepo.complete(transfer.id, user.id);
      await assetRepo.updateStatus(transfer.allocation.assetId, "ALLOCATED");

      await createNotification(tx, {
        recipientId: transfer.fromEmployeeId,
        type: "TRANSFER_APPROVED",
        message: `Transfer approved for ${transfer.allocation.asset.name}`,
        relatedEntityType: "TransferRequest",
        relatedEntityId: transfer.id,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "TRANSFER_APPROVED",
        entityType: "TransferRequest",
        entityId: approved.id,
        oldValue: { status: transfer.status, allocationId: transfer.allocationId },
        newValue: { status: approved.status, allocationId: newAllocation.id },
      });

      return approved;
    });
  }
}

export const decideTransferService = new DecideTransferService();
