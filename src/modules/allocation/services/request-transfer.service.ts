import { AllocationPolicy } from "@/modules/allocation/policies/allocation.policy";
import { AllocationRepository } from "@/modules/allocation/repositories/allocation.repository";
import { TransferRequestRepository } from "@/modules/allocation/repositories/transfer-request.repository";
import type { RequestTransferInput } from "@/modules/allocation/validators/transfer.schema";
import { UserRepository } from "@/modules/identity/repositories/user.repository";
import { DepartmentRepository } from "@/modules/organization/repositories/department.repository";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { createNotification } from "@/modules/notification/services/create-notification.service";
import { AuthorizationError, ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class RequestTransferService {
  async execute(user: SessionUser, input: RequestTransferInput) {
    AllocationPolicy.assertCanRequestTransfer(user);

    if (input.toEmployeeId === user.id) {
      throw new ConflictError("ALLOC_004");
    }

    const allocation = await new AllocationRepository().findById(input.allocationId);
    if (!allocation) throw new ConflictError("ALLOC_001");

    if (allocation.holderEmployeeId !== user.id) {
      throw new AuthorizationError("AUTH_007");
    }
    if (allocation.status !== "ACTIVE") {
      throw new ConflictError("ALLOC_003");
    }

    const target = await new UserRepository().findById(input.toEmployeeId);
    if (!target || target.status !== "ACTIVE") {
      throw new ConflictError("ALLOC_005");
    }

    return withTransaction(async (tx) => {
      const transferRepo = new TransferRequestRepository(tx);
      const deptRepo = new DepartmentRepository(tx);

      const transfer = await transferRepo.create({
        allocation: { connect: { id: allocation.id } },
        fromEmployee: { connect: { id: user.id } },
        toEmployee: { connect: { id: target.id } },
        reason: input.reason,
        status: "REQUESTED",
      });

      const deptHead = target.departmentId
        ? await deptRepo.findHeadId(target.departmentId)
        : null;

      await logActivity(tx, {
        actorId: user.id,
        action: "TRANSFER_REQUESTED",
        entityType: "TransferRequest",
        entityId: transfer.id,
        newValue: transfer,
      });

      if (deptHead?.headId) {
        await createNotification(tx, {
          recipientId: deptHead.headId,
          type: "ASSET_ASSIGNED",
          message: `Transfer requested for ${allocation.asset.assetTag}`,
          relatedEntityType: "TransferRequest",
          relatedEntityId: transfer.id,
        });
      }

      return transfer;
    });
  }
}

export const requestTransferService = new RequestTransferService();
