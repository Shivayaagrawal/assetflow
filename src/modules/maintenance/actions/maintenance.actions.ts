"use server";

import { approveMaintenanceService } from "@/modules/maintenance/services/approve-maintenance.service";
import { assignTechnicianService } from "@/modules/maintenance/services/assign-technician.service";
import { raiseMaintenanceRequestService } from "@/modules/maintenance/services/raise-maintenance-request.service";
import { rejectMaintenanceService } from "@/modules/maintenance/services/reject-maintenance.service";
import { resolveMaintenanceService } from "@/modules/maintenance/services/resolve-maintenance.service";
import { startMaintenanceService } from "@/modules/maintenance/services/start-maintenance.service";
import { MaintenanceRequestRepository } from "@/modules/maintenance/repositories/maintenance-request.repository";
import {
  assignTechnicianSchema,
  maintenanceRequestIdSchema,
  raiseMaintenanceSchema,
  rejectMaintenanceSchema,
} from "@/modules/maintenance/validators/maintenance.schema";
import { requireSessionUser } from "@/shared/auth/session";
import { runAction } from "@/shared/validation/run-action";
import { throwOnFailure } from "@/shared/validation/unwrap-action";

export async function raiseMaintenanceRequestAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = raiseMaintenanceSchema.parse(input);
    return raiseMaintenanceRequestService.execute(user, data);
  });
}

export async function approveMaintenanceAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const { requestId } = maintenanceRequestIdSchema.parse(input);
    return approveMaintenanceService.execute(user, requestId);
  });
}

export async function rejectMaintenanceAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = rejectMaintenanceSchema.parse(input);
    return rejectMaintenanceService.execute(user, data);
  });
}

export async function assignTechnicianAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const data = assignTechnicianSchema.parse(input);
    return assignTechnicianService.execute(user, data);
  });
}

export async function startMaintenanceAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const { requestId } = maintenanceRequestIdSchema.parse(input);
    return startMaintenanceService.execute(user, requestId);
  });
}

export async function resolveMaintenanceAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const { requestId } = maintenanceRequestIdSchema.parse(input);
    return resolveMaintenanceService.execute(user, requestId);
  });
}

export async function raiseMaintenanceRequest(input: unknown) {
  return throwOnFailure(await raiseMaintenanceRequestAction(input));
}

export async function approveMaintenance(input: unknown) {
  return throwOnFailure(await approveMaintenanceAction(input));
}

export async function rejectMaintenance(input: unknown) {
  return throwOnFailure(await rejectMaintenanceAction(input));
}

export async function assignTechnician(input: unknown) {
  return throwOnFailure(await assignTechnicianAction(input));
}

export async function startMaintenance(input: unknown) {
  return throwOnFailure(await startMaintenanceAction(input));
}

export async function resolveMaintenance(input: unknown) {
  return throwOnFailure(await resolveMaintenanceAction(input));
}

export async function listMaintenanceKanban() {
  await requireSessionUser();
  return new MaintenanceRequestRepository().findForKanban();
}
