import { AuditPolicy } from "@/modules/audit/policies/audit.policy";
import { AuditRepository } from "@/modules/audit/repositories/audit.repository";
import type { CreateAuditCycleInput } from "@/modules/audit/validators/audit.schema";
import { logActivity } from "@/modules/activity/services/log-activity.service";
import { ConflictError, ValidationError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { withTransaction } from "@/shared/transactions/with-transaction";
import { prisma } from "@/shared/database";

export class CreateAuditCycleService {
  async execute(user: SessionUser, input: CreateAuditCycleInput) {
    AuditPolicy.assertCanCreate(user);

    if (input.endDate <= input.startDate) {
      throw new ValidationError("End date must be after start date");
    }

    const scopeDepartmentId = input.scopeDepartmentId ?? null;

    const overlap = await new AuditRepository().findOverlappingOpen(
      scopeDepartmentId,
      input.startDate,
      input.endDate
    );
    if (overlap) throw new ConflictError("AUDIT_005");

    const assets = await prisma.asset.findMany({
      where: {
        status: { notIn: ["DISPOSED", "RETIRED"] },
        ...(scopeDepartmentId ? { departmentId: scopeDepartmentId } : {}),
      },
      select: { id: true, location: true },
    });

    if (assets.length === 0) {
      throw new ValidationError("No assets in scope for this audit cycle");
    }

    return withTransaction(async (tx) => {
      const auditRepo = new AuditRepository(tx);

      const cycle = await auditRepo.createCycle({
        name: input.name,
        scopeDepartmentId,
        startDate: input.startDate,
        endDate: input.endDate,
        createdById: user.id,
        auditorIds: input.auditorIds,
        assets,
      });

      await logActivity(tx, {
        actorId: user.id,
        action: "AUDIT_CYCLE_CREATED",
        entityType: "AuditCycle",
        entityId: cycle.id,
        newValue: {
          name: cycle.name,
          assetCount: assets.length,
          auditorCount: input.auditorIds.length,
        },
      });

      return cycle;
    });
  }
}

export const createAuditCycleService = new CreateAuditCycleService();
