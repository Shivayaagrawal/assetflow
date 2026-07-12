import type { Prisma } from "@prisma/client";
import { logActivity as logActivityCore } from "@/modules/activity/services/log-activity.service";

/** Adapter for legacy feature actions — maps old field names to lean ActivityLog schema. */
export async function logActivity(
  tx: Prisma.TransactionClient,
  input: {
    actorId: string;
    actionType: string;
    targetEntityType: string;
    targetEntityId: string;
    description?: string;
    oldValue?: unknown;
    newValue?: unknown;
  }
) {
  return logActivityCore(tx, {
    actorId: input.actorId,
    action: input.actionType,
    entityType: input.targetEntityType,
    entityId: input.targetEntityId,
    oldValue: input.oldValue,
    newValue:
      input.newValue ??
      (input.description ? { description: input.description } : undefined),
  });
}
