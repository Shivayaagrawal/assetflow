import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { raiseMaintenanceRequestService } from "@/modules/maintenance/services/raise-maintenance-request.service";
import { approveMaintenanceService } from "@/modules/maintenance/services/approve-maintenance.service";
import { resolveMaintenanceService } from "@/modules/maintenance/services/resolve-maintenance.service";
import { rejectMaintenanceService } from "@/modules/maintenance/services/reject-maintenance.service";
import { createAuditCycleService } from "@/modules/audit/services/create-audit-cycle.service";
import { verifyAssetService } from "@/modules/audit/services/verify-asset.service";
import { closeAuditCycleService } from "@/modules/audit/services/close-audit-cycle.service";
import { ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { AllocationStatus } from "@prisma/client";

describe("maintenance and audit workflow integration", () => {
  const runId = Date.now().toString(36);
  let categoryId = "";
  let assetId = "";
  let departmentId = "";
  let managerUser: SessionUser;
  let employeeUser: SessionUser;
  let auditCycleId = "";

  beforeAll(async () => {
    const dept = await prisma.department.create({
      data: { name: `Workflows Dept ${runId}`, status: "ACTIVE" },
    });
    departmentId = dept.id;

    const category = await prisma.assetCategory.create({
      data: { name: `Workflows Category ${runId}` },
    });
    categoryId = category.id;

    const asset = await prisma.asset.create({
      data: {
        name: "Workflow Asset",
        assetTag: `AF-WF-${runId}`,
        serialNumber: `SN-WF-${runId}`,
        categoryId,
        status: "AVAILABLE",
        isBookable: false,
        location: "Mumbai",
        departmentId,
      },
    });
    assetId = asset.id;

    const emp = await prisma.user.create({
      data: {
        name: "Workflow Employee",
        email: `emp-${runId}@assetflow.demo`,
        role: "EMPLOYEE",
        status: "ACTIVE",
        departmentId,
      },
    });
    employeeUser = {
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      status: emp.status,
      departmentId: emp.departmentId,
    };

    const mgr = await prisma.user.create({
      data: {
        name: "Workflow Manager",
        email: `mgr-${runId}@assetflow.demo`,
        role: "ASSET_MANAGER",
        status: "ACTIVE",
        departmentId,
      },
    });
    managerUser = {
      id: mgr.id,
      name: mgr.name,
      email: mgr.email,
      role: mgr.role,
      status: mgr.status,
      departmentId: mgr.departmentId,
    };
  });

  afterAll(async () => {
    await prisma.auditItem.deleteMany({
      where: { assetId },
    });
    if (auditCycleId) {
      await prisma.auditCycleAuditor.deleteMany({ where: { auditCycleId } });
      await prisma.auditCycle.delete({ where: { id: auditCycleId } }).catch(() => undefined);
    }
    await prisma.maintenanceRequest.deleteMany({ where: { assetId } });
    await prisma.allocation.deleteMany({ where: { assetId } });
    await prisma.asset.delete({ where: { id: assetId } }).catch(() => undefined);
    await prisma.notification.deleteMany({
      where: { recipientId: { in: [employeeUser.id, managerUser.id] } },
    });
    await prisma.activityLog.deleteMany({
      where: { actorId: { in: [employeeUser.id, managerUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [employeeUser.id, managerUser.id] } },
    });
    await prisma.department.delete({ where: { id: departmentId } }).catch(() => undefined);
    await prisma.assetCategory.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  async function allocateAssetToEmployee() {
    await prisma.maintenanceRequest.deleteMany({ where: { assetId } });
    await prisma.allocation.deleteMany({ where: { assetId } });
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "AVAILABLE" },
    });

    await prisma.allocation.create({
      data: {
        assetId,
        holderType: "EMPLOYEE",
        holderEmployeeId: employeeUser.id,
        status: AllocationStatus.ACTIVE,
      },
    });

    await prisma.asset.update({
      where: { id: assetId },
      data: { status: "ALLOCATED" },
    });
  }

  describe("Maintenance Kanban Workflows", () => {
    it("handles the complete raise -> approve -> resolve cycle", async () => {
      await allocateAssetToEmployee();

      const request = await raiseMaintenanceRequestService.execute(employeeUser, {
        assetId,
        description: "Bulb flickering",
        priority: "MEDIUM",
      });

      expect(request.status).toBe("PENDING");

      let dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("ALLOCATED");

      const approved = await approveMaintenanceService.execute(managerUser, request.id);
      expect(approved.status).toBe("APPROVED");

      dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("UNDER_MAINTENANCE");

      await prisma.maintenanceRequest.update({
        where: { id: request.id },
        data: { status: "IN_PROGRESS" },
      });

      const resolved = await resolveMaintenanceService.execute(managerUser, request.id);
      expect(resolved.status).toBe("RESOLVED");

      dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("ALLOCATED");
    });

    it("rejects direct transition from Pending to Resolved", async () => {
      await allocateAssetToEmployee();

      const request = await raiseMaintenanceRequestService.execute(employeeUser, {
        assetId,
        description: "Direct jump test",
        priority: "LOW",
      });

      await expect(
        resolveMaintenanceService.execute(managerUser, request.id)
      ).rejects.toThrow(ConflictError);
    });

    it("handles rejection correctly, keeping asset status unchanged", async () => {
      await allocateAssetToEmployee();

      const request = await raiseMaintenanceRequestService.execute(employeeUser, {
        assetId,
        description: "Rejection test",
        priority: "LOW",
      });

      const rejected = await rejectMaintenanceService.execute(managerUser, {
        requestId: request.id,
        reason: "No issues found",
      });

      expect(rejected.status).toBe("REJECTED");

      const dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("ALLOCATED");
    });
  });

  describe("Audit Cycle Workflows", () => {
    it("handles audit cycle creation, asset verification, live discrepancy report, and lost cascade", async () => {
      await prisma.allocation.deleteMany({ where: { assetId } });
      await prisma.asset.update({
        where: { id: assetId },
        data: { status: "AVAILABLE" },
      });

      const cycleResult = await createAuditCycleService.execute(managerUser, {
        name: `Q3 Scope Test ${runId}`,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-31"),
        scopeDepartmentId: departmentId,
        auditorIds: [employeeUser.id],
      });
      auditCycleId = cycleResult.id;

      expect(cycleResult.status).toBe("OPEN");

      await verifyAssetService.execute(employeeUser, {
        auditCycleId: cycleResult.id,
        assetId,
        verificationStatus: "MISSING",
        notes: "Not on Mumbai floor",
      });

      let dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("AVAILABLE");

      const closeResult = await closeAuditCycleService.execute(managerUser, {
        auditCycleId: cycleResult.id,
      });

      expect(closeResult.cycle.status).toBe("CLOSED");
      expect(closeResult.missingMarkedLost).toBe(1);

      dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("LOST");
    });
  });
});
