import { MaintenancePriority } from "@prisma/client";
import { z } from "zod";

export const raiseMaintenanceSchema = z.object({
  assetId: z.string().min(1),
  description: z.string().trim().min(5).max(1000),
  priority: z.nativeEnum(MaintenancePriority).default("MEDIUM"),
});

export const maintenanceRequestIdSchema = z.object({
  requestId: z.string().min(1),
});

export const assignTechnicianSchema = z.object({
  requestId: z.string().min(1),
  technicianName: z.string().trim().min(2).max(120),
});

export const rejectMaintenanceSchema = z.object({
  requestId: z.string().min(1),
  reason: z.string().trim().max(500).optional(),
});

export type RaiseMaintenanceInput = z.infer<typeof raiseMaintenanceSchema>;
export type AssignTechnicianInput = z.infer<typeof assignTechnicianSchema>;
export type RejectMaintenanceInput = z.infer<typeof rejectMaintenanceSchema>;
