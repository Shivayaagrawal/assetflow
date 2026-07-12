/**
 * Workflow E2E — Service → Repository → PostgreSQL (action-equivalent paths).
 * Invoked from scripts/e2e-curl.sh after HTTP auth checks.
 */
import { prisma } from "../src/lib/db";
import { toSessionUser } from "../src/shared/auth/session";
import { createDepartmentService } from "../src/modules/organization/services/create-department.service";
import { updateDepartmentService } from "../src/modules/organization/services/update-department.service";
import { deactivateDepartmentService } from "../src/modules/organization/services/deactivate-department.service";
import { deactivateCategoryService } from "../src/modules/organization/services/deactivate-category.service";
import { updateEmployeeRoleService } from "../src/modules/identity/services/update-employee-role.service";
import { deactivateEmployeeService } from "../src/modules/identity/services/deactivate-employee.service";
import { registerAssetService } from "../src/modules/asset/services/register-asset.service";
import { allocateAssetService } from "../src/modules/allocation/services/allocate-asset.service";
import { returnAssetService } from "../src/modules/allocation/services/return-asset.service";
import { createBookingService } from "../src/modules/booking/services/create-booking.service";
import { cancelBookingService } from "../src/modules/booking/services/cancel-booking.service";
import { raiseMaintenanceRequestService } from "../src/modules/maintenance/services/raise-maintenance-request.service";
import { requestTransferService } from "../src/modules/allocation/services/request-transfer.service";
import { decideTransferService } from "../src/modules/allocation/services/decide-transfer.service";
import { approveMaintenanceService } from "../src/modules/maintenance/services/approve-maintenance.service";
import { assignTechnicianService } from "../src/modules/maintenance/services/assign-technician.service";
import { resolveMaintenanceService } from "../src/modules/maintenance/services/resolve-maintenance.service";
import { startMaintenanceService } from "../src/modules/maintenance/services/start-maintenance.service";
import { createAuditCycleService } from "../src/modules/audit/services/create-audit-cycle.service";
import { verifyAssetService } from "../src/modules/audit/services/verify-asset.service";
import { closeAuditCycleService } from "../src/modules/audit/services/close-audit-cycle.service";
import { runOverdueScan } from "../src/modules/notification/services/overdue-return-scan.service";
import { runBookingReminderScan } from "../src/modules/notification/services/booking-reminder-scan.service";
import { auth } from "../src/lib/auth";
import { getPasswordResetToken } from "../src/lib/password-reset-dev";
import { AppError } from "../src/shared/errors/app-error";
import type { SessionUser } from "../src/shared/types/action-result";

const runId = process.argv[2] ?? Date.now().toString();
const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const origin = process.env.ORIGIN ?? "http://localhost:3000";
const password = process.env.SEED_PASSWORD ?? "Password123!";

let pass = 0;
let fail = 0;

function ok(label: string) {
  pass++;
  console.log(`  PASS: ${label}`);
}

function bad(label: string, detail?: unknown) {
  fail++;
  console.error(`  FAIL: ${label}`, detail ?? "");
}

async function expectError(
  label: string,
  code: string,
  fn: () => Promise<unknown>
) {
  try {
    await fn();
    bad(`${label} — expected ${code}`);
  } catch (error) {
    if (error instanceof AppError && error.code === code) {
      ok(`${label} (${code})`);
    } else {
      bad(`${label} — expected ${code}`, error);
    }
  }
}

async function sessionFor(email: string): Promise<SessionUser> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return toSessionUser(user);
}

async function main() {
  console.log(`  Workflow run id: ${runId}`);

  const admin = await sessionFor("admin@assetflow.demo");
  const assetManager = await sessionFor("arjun@assetflow.demo");
  const deptHead = await sessionFor("aditi@assetflow.demo");
  const employee = await sessionFor("priya@assetflow.demo");

  const engineering = await prisma.department.findFirstOrThrow({
    where: { name: "Engineering" },
  });
  const electronics = await prisma.assetCategory.findFirstOrThrow({
    where: { name: "Electronics" },
  });

  // Organization — easy
  await createDepartmentService.execute(admin, { name: `E2E Dept ${runId}` });
  ok("create department");

  const childDept = await createDepartmentService.execute(admin, {
    name: `E2E Child ${runId}`,
    parentDepartmentId: engineering.id,
  });
  ok("create child department");

  // Organization — hard: cycle ORG_002
  await expectError("department cycle", "ORG_002", () =>
    updateDepartmentService.execute(admin, engineering.id, {
      name: engineering.name,
      parentDepartmentId: childDept.id,
    })
  );

  await expectError("deactivate department with employees", "ORG_003", () =>
    deactivateDepartmentService.execute(admin, engineering.id)
  );

  await expectError("deactivate category with assets", "ORG_004", () =>
    deactivateCategoryService.execute(admin, electronics.id)
  );

  // Identity — promote (idempotent)
  await updateEmployeeRoleService.execute(admin, {
    userId: employee.id,
    role: "EMPLOYEE",
    departmentId: engineering.id,
    status: "ACTIVE",
  });
  ok("update employee role");

  // Assets — register + duplicate serial
  const registered = await registerAssetService.execute(assetManager, {
    name: `E2E Laptop ${runId}`,
    serialNumber: `SN-E2E-${runId}`,
    categoryId: electronics.id,
    acquisitionDate: new Date("2025-01-01"),
    acquisitionCost: 50000,
    location: "Lab",
    isBookable: false,
  });
  ok(`register asset (${registered.assetTag})`);

  await expectError("duplicate serial", "ASSET_002", () =>
    registerAssetService.execute(assetManager, {
      name: "Duplicate serial",
      serialNumber: `SN-E2E-${runId}`,
      categoryId: electronics.id,
      acquisitionDate: new Date("2025-01-01"),
      acquisitionCost: 1000,
      location: "Lab",
      isBookable: false,
    })
  );

  // Allocation — allocate, double-block, return
  const firstAlloc = await allocateAssetService.execute(assetManager, {
    assetId: registered.id,
    employeeId: employee.id,
    expectedReturnDate: new Date("2026-12-31"),
  });
  ok("allocate available asset");

  await expectError("double allocation", "ASSET_004", () =>
    allocateAssetService.execute(assetManager, {
      assetId: registered.id,
      employeeId: admin.id,
    })
  );

  await returnAssetService.execute(assetManager, {
    allocationId: firstAlloc.id,
  });
  ok("return allocation");

  const returnLog = await prisma.activityLog.count({
    where: { entityId: registered.id, action: "ASSET_RETURNED" },
  });
  if (returnLog >= 1) ok("activity log on return");
  else bad("missing activity log on return");

  const assignNotif = await prisma.notification.count({
    where: {
      recipientId: employee.id,
      type: "ASSET_ASSIGNED",
      relatedEntityType: "Allocation",
      relatedEntityId: firstAlloc.id,
    },
  });
  if (assignNotif === 1) ok("allocation notification emitted once");
  else bad("allocation notification count", assignNotif);

  // Booking — overlap, adjacent, cancel
  const room = await prisma.asset.findFirstOrThrow({
    where: { isBookable: true, status: "AVAILABLE" },
  });

  const baseStart = new Date("2031-06-15T09:00:00+05:30");
  const baseEnd = new Date("2031-06-15T10:00:00+05:30");
  await prisma.booking.create({
    data: {
      assetId: room.id,
      bookedById: employee.id,
      startTime: baseStart,
      endTime: baseEnd,
      status: "UPCOMING",
    },
  });

  await expectError("booking overlap", "BOOKING_002", () =>
    createBookingService.execute(employee, {
      assetId: room.id,
      startTime: new Date("2031-06-15T09:30:00+05:30"),
      endTime: new Date("2031-06-15T10:30:00+05:30"),
    })
  );

  const adjacent = await createBookingService.execute(employee, {
    assetId: room.id,
    startTime: new Date("2031-06-15T10:00:00+05:30"),
    endTime: new Date("2031-06-15T11:00:00+05:30"),
  });
  ok("adjacent booking accepted");

  await cancelBookingService.execute(employee, adjacent.id);
  ok("cancel booking");

  await prisma.booking.deleteMany({
    where: { assetId: room.id, startTime: { gte: new Date("2031-01-01") } },
  });

  // Transfer — request + approve (re-allocate after return)
  const reAlloc = await allocateAssetService.execute(assetManager, {
    assetId: registered.id,
    employeeId: employee.id,
  });
  ok("re-allocate for transfer test");

  const procurement = await prisma.user.findUniqueOrThrow({
    where: { email: "procurement@assetflow.demo" },
  });
  const transfer = await requestTransferService.execute(employee, {
    allocationId: reAlloc.id,
    toEmployeeId: procurement.id,
    reason: "E2E transfer",
  });
  ok("request transfer");

  await decideTransferService.execute(deptHead, {
    transferRequestId: transfer.id,
    decision: "APPROVED",
  });
  ok("approve transfer");

  const transferNotif = await prisma.notification.count({
    where: {
      recipientId: employee.id,
      type: "TRANSFER_APPROVED",
      relatedEntityId: transfer.id,
    },
  });
  if (transferNotif === 1) ok("transfer approval notification");
  else bad("transfer notification", transferNotif);

  // Identity — deactivate + session purge + inactive login block
  const tempEmail = `deact-${runId}@assetflow.demo`;
  const { hashPassword } = await import("better-auth/crypto");
  const pwHash = await hashPassword(password);
  const tempUser = await prisma.user.create({
    data: {
      name: "Deactivate Me",
      email: tempEmail,
      emailVerified: true,
      role: "EMPLOYEE",
      status: "ACTIVE",
      accounts: {
        create: {
          accountId: `acct-${runId}`,
          providerId: "credential",
          password: pwHash,
        },
      },
      sessions: {
        create: {
          token: `tok-${runId}`,
          expiresAt: new Date(Date.now() + 86400000),
        },
      },
    },
  });

  const sessionsBefore = await prisma.session.count({ where: { userId: tempUser.id } });
  await deactivateEmployeeService.execute(admin, tempUser.id);
  const sessionsAfter = await prisma.session.count({ where: { userId: tempUser.id } });
  if (sessionsBefore > 0 && sessionsAfter === 0) ok("deactivate purges sessions");
  else bad("session purge", { sessionsBefore, sessionsAfter });

  const loginRes = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email: tempEmail, password }),
  });
  const loginBody = (await loginRes.json()) as { code?: string; message?: string };
  if (
    loginRes.status === 403 &&
    (loginBody.message?.includes("inactive") || loginBody.code === "FORBIDDEN")
  ) {
    ok("inactive user blocked at sign-in (AUTH_003)");
  } else {
    bad("inactive login block", { status: loginRes.status, loginBody });
  }

  await prisma.user.delete({ where: { id: tempUser.id } }).catch(() => undefined);

  // Password reset flow (server-side Better Auth + dev token store)
  const resetEmail = `reset-${runId}@assetflow.demo`;
  const { hashPassword: hashPw } = await import("better-auth/crypto");
  await prisma.user.create({
    data: {
      name: "Reset User",
      email: resetEmail,
      emailVerified: true,
      role: "EMPLOYEE",
      status: "ACTIVE",
      accounts: {
        create: {
          accountId: `reset-acct-${runId}`,
          providerId: "credential",
          password: await hashPw(password),
        },
      },
    },
  });
  await auth.api.requestPasswordReset({
    body: { email: resetEmail, redirectTo: `${baseUrl}/reset-password` },
  });
  const resetMeta = getPasswordResetToken(resetEmail);
  if (resetMeta?.token) {
    await auth.api.resetPassword({
      body: { token: resetMeta.token, newPassword: "NewPassword123!" },
    });
    ok("password reset completes");
  } else {
    bad("password reset token missing from dev store");
  }
  await prisma.user.deleteMany({ where: { email: resetEmail } }).catch(() => undefined);

  // Maintenance full workflow
  const maintAsset = await registerAssetService.execute(assetManager, {
    name: `Maint Asset ${runId}`,
    serialNumber: `SN-MAINT-${runId}`,
    categoryId: electronics.id,
    acquisitionDate: new Date("2025-01-01"),
    acquisitionCost: 10000,
    location: "Workshop",
    isBookable: false,
  });
  const maintAlloc = await allocateAssetService.execute(assetManager, {
    assetId: maintAsset.id,
    employeeId: employee.id,
  });
  const maintReq = await raiseMaintenanceRequestService.execute(employee, {
    assetId: maintAsset.id,
    description: `Workflow maintenance ${runId}`,
    priority: "HIGH",
  });
  ok("raise maintenance request");
  await approveMaintenanceService.execute(assetManager, maintReq.id);
  ok("approve maintenance → UNDER_MAINTENANCE");
  const assetUnderMaint = await prisma.asset.findUniqueOrThrow({
    where: { id: maintAsset.id },
  });
  if (assetUnderMaint.status === "UNDER_MAINTENANCE") ok("asset status UNDER_MAINTENANCE");
  else bad("asset not UNDER_MAINTENANCE", assetUnderMaint.status);

  await assignTechnicianService.execute(assetManager, {
    requestId: maintReq.id,
    technicianName: "Tech E2E",
  });
  await startMaintenanceService.execute(assetManager, maintReq.id);
  await resolveMaintenanceService.execute(assetManager, maintReq.id);
  ok("maintenance resolved");
  const assetAfterMaint = await prisma.asset.findUniqueOrThrow({
    where: { id: maintAsset.id },
  });
  if (assetAfterMaint.status === "ALLOCATED") ok("asset restored after maintenance");
  else bad("asset status after resolve", assetAfterMaint.status);

  await returnAssetService.execute(assetManager, { allocationId: maintAlloc.id });

  // Audit — verify missing + close → lost
  const auditCycle = await createAuditCycleService.execute(assetManager, {
    name: `E2E Audit ${runId}`,
    scopeDepartmentId: null,
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-31"),
    auditorIds: [deptHead.id],
  });
  ok("create audit cycle");

  const auditAsset = await registerAssetService.execute(assetManager, {
    name: `Audit Target ${runId}`,
    serialNumber: `SN-AUDIT-${runId}`,
    categoryId: electronics.id,
    acquisitionDate: new Date("2025-01-01"),
    acquisitionCost: 1000,
    location: "Shelf A",
    isBookable: false,
  });

  await prisma.auditItem.create({
    data: {
      auditCycleId: auditCycle.id,
      assetId: auditAsset.id,
      expectedLocation: "Shelf A",
      verificationStatus: "PENDING",
    },
  });

  await verifyAssetService.execute(deptHead, {
    auditCycleId: auditCycle.id,
    assetId: auditAsset.id,
    verificationStatus: "MISSING",
  });
  ok("verify asset as MISSING");

  const closeResult = await closeAuditCycleService.execute(assetManager, {
    auditCycleId: auditCycle.id,
  });
  if (closeResult.missingMarkedLost >= 1) ok("close audit marks missing as LOST");
  else bad("missing marked lost count", closeResult.missingMarkedLost);

  const lostAsset = await prisma.asset.findUniqueOrThrow({ where: { id: auditAsset.id } });
  if (lostAsset.status === "LOST") ok("missing asset → LOST on close");
  else bad("asset not LOST", lostAsset.status);

  // Overdue return notification
  const overdueAlloc = await allocateAssetService.execute(assetManager, {
    assetId: (
      await registerAssetService.execute(assetManager, {
        name: `Overdue ${runId}`,
        serialNumber: `SN-OVD-${runId}`,
        categoryId: electronics.id,
        acquisitionDate: new Date("2025-01-01"),
        acquisitionCost: 1000,
        location: "Lab",
        isBookable: false,
      })
    ).id,
    employeeId: employee.id,
    expectedReturnDate: new Date("2020-01-01"),
  });
  const overdueBefore = await prisma.notification.count({
    where: {
      type: "OVERDUE_RETURN_ALERT",
      relatedEntityId: overdueAlloc.id,
      recipientId: employee.id,
    },
  });
  const overdueScan = await runOverdueScan();
  const overdueAfter = await prisma.notification.count({
    where: {
      type: "OVERDUE_RETURN_ALERT",
      relatedEntityId: overdueAlloc.id,
      recipientId: employee.id,
    },
  });
  if (overdueAfter > overdueBefore && overdueScan.created >= 1) {
    ok("overdue cron creates notification");
  } else {
    bad("overdue notification", { overdueBefore, overdueAfter, overdueScan });
  }

  // Booking reminder notification
  const reminderAsset = await registerAssetService.execute(assetManager, {
    name: `Reminder Room ${runId}`,
    serialNumber: `SN-RM-${runId}`,
    categoryId: electronics.id,
    acquisitionDate: new Date("2025-01-01"),
    acquisitionCost: 0,
    location: "Floor C",
    isBookable: true,
  });
  const reminderStart = new Date(Date.now() + 20 * 60 * 1000);
  const reminderEnd = new Date(reminderStart.getTime() + 60 * 60 * 1000);
  const reminderBooking = await createBookingService.execute(employee, {
    assetId: reminderAsset.id,
    startTime: reminderStart,
    endTime: reminderEnd,
  });
  const reminderBefore = await prisma.notification.count({
    where: {
      type: "BOOKING_REMINDER",
      relatedEntityId: reminderBooking.id,
      recipientId: employee.id,
    },
  });
  const reminderScan = await runBookingReminderScan();
  const reminderAfter = await prisma.notification.count({
    where: {
      type: "BOOKING_REMINDER",
      relatedEntityId: reminderBooking.id,
      recipientId: employee.id,
    },
  });
  if (reminderAfter > reminderBefore && reminderScan.created >= 1) {
    ok("booking reminder creates notification");
  } else {
    bad("booking reminder notification", { reminderBefore, reminderAfter, reminderScan });
  }

  console.log(`\n  Workflow results: ${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
