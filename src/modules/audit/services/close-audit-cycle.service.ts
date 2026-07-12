import { AssetStateMachine } from "@/modules/asset/domain/asset-state-machine";
import { AssetRepository } from "@/modules/asset/repositories/asset.repository";
import { AuditPolicy } from "@/modules/audit/policies/audit.policy";
import { AuditRepository } from "@/modules/audit/repositories/audit.repository";
import type {
  CloseAuditCycleInput,
  DiscrepancyItem,
} from "@/modules/audit/validators/audit.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { createNotification } from "@/modules/notification/services/create-notification.service";
import { UserRepository } from "@/modules/identity/repositories/user.repository";
import { ConflictError, NotFoundError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";

export class CloseAuditCycleService {
  async execute(user: SessionUser, input: CloseAuditCycleInput) {
    AuditPolicy.assertCanClose(user);

    const cycle = await new AuditRepository().findById(input.auditCycleId);
    if (!cycle) throw new NotFoundError("AUDIT_001");

    if (cycle.status === "CLOSED") {
      throw new ConflictError("AUDIT_003");
    }

    return withTransaction(async (tx) => {
      const auditRepo = new AuditRepository(tx);
      const assetRepo = new AssetRepository(tx);
      const userRepo = new UserRepository(tx);

      const closed = await auditRepo.closeCycle(input.auditCycleId);
      if (!closed) throw new ConflictError("AUDIT_003");

      const missingItems = await auditRepo.listMissingItems(input.auditCycleId);

      for (const item of missingItems) {
        AssetStateMachine.assertTransition(item.asset.status, "LOST");
        await assetRepo.updateStatus(item.asset.id, "LOST");
      }

      const discrepancies = await auditRepo.listDiscrepancies(input.auditCycleId);
      const report: DiscrepancyItem[] = discrepancies.map((row) => ({
        assetId: row.asset.id,
        assetTag: row.asset.assetTag,
        assetName: row.asset.name,
        verificationStatus: row.verificationStatus,
        notes: row.notes,
      }));

      const managers = await userRepo.findActiveManagers();
      await Promise.all(
        managers.map((manager) =>
          createNotification(tx, {
            recipientId: manager.id,
            type: "AUDIT_DISCREPANCY_FLAGGED",
            message: `Audit "${cycle.name}" closed with ${report.length} discrepancies`,
            relatedEntityType: "AuditCycle",
            relatedEntityId: cycle.id,
          })
        )
      );

      await logActivity(tx, {
        actorId: user.id,
        action: "AUDIT_CYCLE_CLOSED",
        entityType: "AuditCycle",
        entityId: cycle.id,
        oldValue: { status: "OPEN" },
        newValue: {
          status: "CLOSED",
          missingMarkedLost: missingItems.length,
          discrepancyCount: report.length,
        },
      });

      return {
        cycle: await auditRepo.findByIdOrThrow(input.auditCycleId),
        discrepancies: report,
        missingMarkedLost: missingItems.length,
      };
    });
  }
}

export const closeAuditCycleService = new CloseAuditCycleService();
