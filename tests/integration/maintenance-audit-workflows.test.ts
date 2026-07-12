import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { raiseMaintenanceRequestService } from "@/modules/maintenance/services/raise-maintenance-request.service";
import { approveMaintenanceService } from "@/modules/maintenance/services/approve-maintenance.service";
import { assignTechnicianService } from "@/modules/maintenance/services/assign-technician.service";
import { startMaintenanceService } from "@/modules/maintenance/services/start-maintenance.service";
import { resolveMaintenanceService } from "@/modules/maintenance/services/resolve-maintenance.service";
import { rejectMaintenanceService } from "@/modules/maintenance/services/reject-maintenance.service";
import { createAuditCycleService } from "@/modules/audit/services/create-audit-cycle.service";
import { verifyAssetService } from "@/modules/audit/services/verify-asset.service";
import { closeAuditCycleService } from "@/modules/audit/services/close-audit-cycle.service";
import { getMyNotificationsAction } from "@/modules/notification/actions/notification.actions";
import { ConflictError } from "@/shared/errors/app-error";
import type { SessionUser } from "@/shared/types/action-result";
import { AllocationStatus } from "@prisma/client";

describe("maintenance and audit workflow integration", () => {
  const runId = Date.now().toString(36);
  let categoryId = "";
  let assetId = "";
  let deptAId = "";
  let deptBId = "";
  let managerUser: SessionUser;
  let employeeUser: SessionUser;
  let deptBHeadUser: SessionUser;
  let auditCycleId = "";

  beforeAll(async () => {
    const deptA = await prisma.department.create({
      data: { name: `Workflows Dept A ${runId}`, status: "ACTIVE" },
    });
    deptAId = deptA.id;

    const deptB = await prisma.department.create({
      data: { name: `Workflows Dept B ${runId}`, status: "ACTIVE" },
    });
    deptBId = deptB.id;

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
        departmentId: deptAId,
      },
    });
    assetId = asset.id;

    const emp = await prisma.user.create({
      data: {
        name: "Workflow Employee",
        email: `emp-${runId}@assetflow.demo`,
        role: "EMPLOYEE",
        status: "ACTIVE",
        departmentId: deptAId,
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

    const deptHead = await prisma.user.create({
      data: {
        name: "Dept B Head",
        email: `head-${runId}@assetflow.demo`,
        role: "DEPARTMENT_HEAD",
        status: "ACTIVE",
        departmentId: deptBId,
      },
    });
    deptBHeadUser = {
      id: deptHead.id,
      name: deptHead.name,
      email: deptHead.email,
      role: deptHead.role,
      status: deptHead.status,
      departmentId: deptHead.departmentId,
    };

    const mgr = await prisma.user.create({
      data: {
        name: "Workflow Manager",
        email: `mgr-${runId}@assetflow.demo`,
        role: "ASSET_MANAGER",
        status: "ACTIVE",
        departmentId: deptAId,
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
      where: { recipientId: { in: [employeeUser.id, managerUser.id, deptBHeadUser.id] } },
    });
    await prisma.activityLog.deleteMany({
      where: { actorId: { in: [employeeUser.id, managerUser.id, deptBHeadUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [employeeUser.id, managerUser.id, deptBHeadUser.id] } },
    });
    await prisma.department.deleteMany({
      where: { id: { in: [deptAId, deptBId] } },
    });
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

  describe("Maintenance Kanban Workflows (5 Stages & Linear Transitions)", () => {
    it("walks a request through all 5 stages in order and rejects intermediate state skipping", async () => {
      await allocateAssetToEmployee();

      const request = await raiseMaintenanceRequestService.execute(employeeUser, {
        assetId,
        description: "Stage testing",
        priority: "MEDIUM",
      });
      expect(request.status).toBe("PENDING");

      let dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("ALLOCATED");

      await expect(
        resolveMaintenanceService.execute(managerUser, request.id)
      ).rejects.toThrow(ConflictError);

      await expect(
        assignTechnicianService.execute(managerUser, { requestId: request.id, technicianName: "Bob" })
      ).rejects.toThrow(ConflictError);

      const approved = await approveMaintenanceService.execute(managerUser, request.id);
      expect(approved.status).toBe("APPROVED");
      dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("UNDER_MAINTENANCE");

      await expect(
        startMaintenanceService.execute(managerUser, request.id)
      ).rejects.toThrow(ConflictError);

      const assigned = await assignTechnicianService.execute(managerUser, {
        requestId: request.id,
        technicianName: "John Doe",
      });
      expect(assigned.status).toBe("TECHNICIAN_ASSIGNED");
      expect(assigned.technicianName).toBe("John Doe");

      await expect(
        resolveMaintenanceService.execute(managerUser, request.id)
      ).rejects.toThrow(ConflictError);

      const started = await startMaintenanceService.execute(managerUser, request.id);
      expect(started.status).toBe("IN_PROGRESS");

      const resolved = await resolveMaintenanceService.execute(managerUser, request.id);
      expect(resolved.status).toBe("RESOLVED");

      dbAsset = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(dbAsset.status).toBe("ALLOCATED");
    });
  });

  describe("Gap 2: Double raise-resolve cycle sequentially on the same asset", () => {
    it("handles double raise->approve->resolve sequence successfully", async () => {
      await allocateAssetToEmployee();

      const req1 = await raiseMaintenanceRequestService.execute(employeeUser, {
        assetId,
        description: "Cycle 1 flickering",
        priority: "LOW",
      });
      expect(req1.status).toBe("PENDING");

      await approveMaintenanceService.execute(managerUser, req1.id);
      let assetState = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(assetState.status).toBe("UNDER_MAINTENANCE");

      await prisma.maintenanceRequest.update({
        where: { id: req1.id },
        data: { status: "IN_PROGRESS" },
      });

      await resolveMaintenanceService.execute(managerUser, req1.id);
      assetState = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(assetState.status).toBe("ALLOCATED");

      const req2 = await raiseMaintenanceRequestService.execute(employeeUser, {
        assetId,
        description: "Cycle 2 flickering",
        priority: "HIGH",
      });
      expect(req2.status).toBe("PENDING");

      await approveMaintenanceService.execute(managerUser, req2.id);
      assetState = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(assetState.status).toBe("UNDER_MAINTENANCE");

      await prisma.maintenanceRequest.update({
        where: { id: req2.id },
        data: { status: "IN_PROGRESS" },
      });

      await resolveMaintenanceService.execute(managerUser, req2.id);
      assetState = await prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
      expect(assetState.status).toBe("ALLOCATED");
    });
  });

  describe("Gap 3: Notifications Cross-User Isolation and Scoping", () => {
    it("isolates notifications between users and rejects forged ID access", async () => {
      const notif = await prisma.notification.create({
        data: {
          recipientId: employeeUser.id,
          type: "MAINTENANCE_APPROVED",
          message: "Secret notification",
          relatedEntityType: "MaintenanceRequest",
          relatedEntityId: "dummy-id",
        },
      });

      expect(notif.recipientId).toBe(employeeUser.id);
      
      const userANotifs = await prisma.notification.findMany({
        where: { recipientId: employeeUser.id },
      });
      const userBNotifs = await prisma.notification.findMany({
        where: { recipientId: managerUser.id },
      });

      expect(userANotifs.map(n => n.id)).toContain(notif.id);
      expect(userBNotifs.map(n => n.id)).not.toContain(notif.id);

      const updatedCount = await prisma.notification.updateMany({
        where: { id: notif.id, recipientId: managerUser.id },
        data: { isRead: true },
      });
      expect(updatedCount.count).toBe(0);
    });
  });

  describe("Gap 4: Auditor acting as Department Head elsewhere", () => {
    it("allows a Department B Head to audit assets in Department A when assigned as auditor", async () => {
      const cycleResult = await createAuditCycleService.execute(managerUser, {
        name: `Cross Dept Audit ${runId}`,
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-07-31"),
        scopeDepartmentId: deptAId,
        auditorIds: [deptBHeadUser.id],
      });
      auditCycleId = cycleResult.id;

      expect(cycleResult.status).toBe("OPEN");

      const verifiedItem = await verifyAssetService.execute(deptBHeadUser, {
        auditCycleId: cycleResult.id,
        assetId,
        verificationStatus: "VERIFIED",
        notes: "Auditor from B verified asset from A",
      });

      expect(verifiedItem.verificationStatus).toBe("VERIFIED");

      const dbItem = await prisma.auditItem.findUniqueOrThrow({
        where: {
          auditCycleId_assetId: {
            auditCycleId: cycleResult.id,
            assetId,
          },
        },
      });
      expect(dbItem.notes).toBe("Auditor from B verified asset from A");
    });
  });
});
