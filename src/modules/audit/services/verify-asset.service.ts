import { AuditPolicy } from "@/modules/audit/policies/audit.policy";
import { AuditRepository } from "@/modules/audit/repositories/audit.repository";
import type { VerifyAssetInput } from "@/modules/audit/validators/audit.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class VerifyAssetService {
  async execute(user: SessionUser, input: VerifyAssetInput) {
    const item = await new AuditRepository().findItem(input.auditCycleId, input.assetId);
    if (!item) throw new NotFoundError("AUDIT_001");

    if (item.auditCycle.status !== "OPEN") {
      throw new ConflictError("AUDIT_003");
    }

    const auditorIds = item.auditCycle.auditors.map((row) => row.auditorId);
    AuditPolicy.assertCanVerify(user, auditorIds);

    if (item.verificationStatus !== "PENDING") {
      throw new ConflictError("AUDIT_002");
    }

    return withTransaction(async (tx) => {
      const auditRepo = new AuditRepository(tx);

      const verified = await auditRepo.verifyItem(input.auditCycleId, input.assetId, {
        verificationStatus: input.verificationStatus,
        notes: input.notes,
        expectedLocation: input.expectedLocation ?? item.expectedLocation,
        verifiedById: user.id,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "AUDIT_ASSET_VERIFIED",
        entityType: "AuditItem",
        entityId: verified.id,
        oldValue: { verificationStatus: "PENDING" },
        newValue: {
          verificationStatus: input.verificationStatus,
          assetId: input.assetId,
        },
      });

      return verified;
    });
  }
}

export const verifyAssetService = new VerifyAssetService();
