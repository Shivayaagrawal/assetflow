import type { NotificationType } from "@prisma/client";
import { prisma } from "../src/lib/db";

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysAgo(days: number) {
  return daysFromNow(-days);
}

function atLocalTime(base: Date, hours: number, minutes: number) {
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function hashPassword(password: string): Promise<string> {
  const { hashPassword: hash } = await import("better-auth/crypto");
  return hash(password);
}

async function createAuthUser(input: {
  name: string;
  email: string;
  role: "EMPLOYEE" | "DEPARTMENT_HEAD" | "ASSET_MANAGER" | "ADMIN";
  departmentId?: string;
  status?: "ACTIVE" | "INACTIVE";
}) {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      emailVerified: true,
      role: input.role,
      status: input.status ?? "ACTIVE",
      departmentId: input.departmentId,
    },
  });

  await prisma.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: passwordHash,
    },
  });

  return user;
}

async function seedNotification(input: {
  recipientId: string;
  type: NotificationType;
  message: string;
  relatedEntityType: string;
  relatedEntityId: string;
  isRead?: boolean;
}) {
  await prisma.notification.create({
    data: {
      recipientId: input.recipientId,
      type: input.type,
      message: input.message,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      isRead: input.isRead ?? false,
    },
  });
}

async function seedActivity(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt?: Date;
}) {
  await prisma.activityLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      oldValue: input.oldValue ?? undefined,
      newValue: input.newValue ?? undefined,
      createdAt: input.createdAt ?? new Date(),
    },
  });
}

async function main() {
  console.log("Seeding AssetFlow demo data...");

  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditItem.deleteMany();
  await prisma.auditCycleAuditor.deleteMany();
  await prisma.auditCycle.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const today = new Date();

  const engineering = await prisma.department.create({
    data: { name: "Engineering", status: "ACTIVE" },
  });
  const fieldOpsEast = await prisma.department.create({
    data: { name: "Field Ops East", status: "ACTIVE" },
  });
  const facilities = await prisma.department.create({
    data: { name: "Facilities", status: "ACTIVE" },
  });

  const electronics = await prisma.assetCategory.create({
    data: {
      name: "Electronics",
      customFields: { warrantyMonths: 24, requiresSerial: true },
    },
  });
  const furniture = await prisma.assetCategory.create({
    data: {
      name: "Furniture",
      customFields: { warrantyMonths: 12 },
    },
  });
  const rooms = await prisma.assetCategory.create({
    data: { name: "Conference Rooms" },
  });
  const vehicles = await prisma.assetCategory.create({
    data: {
      name: "Vehicles",
      customFields: { registrationRequired: true },
    },
  });

  const admin = await createAuthUser({
    name: "Admin User",
    email: "admin@assetflow.demo",
    role: "ADMIN",
  });

  const aditi = await createAuthUser({
    name: "Aditi Rao",
    email: "aditi@assetflow.demo",
    role: "DEPARTMENT_HEAD",
    departmentId: engineering.id,
  });
  const sana = await createAuthUser({
    name: "Sana Iqbal",
    email: "sana@assetflow.demo",
    role: "DEPARTMENT_HEAD",
    departmentId: fieldOpsEast.id,
    status: "INACTIVE",
  });
  const rohan = await createAuthUser({
    name: "Rohan Mehta",
    email: "rohan@assetflow.demo",
    role: "DEPARTMENT_HEAD",
    departmentId: facilities.id,
  });

  await prisma.department.update({
    where: { id: engineering.id },
    data: { headId: aditi.id },
  });
  await prisma.department.update({
    where: { id: fieldOpsEast.id },
    data: { headId: sana.id },
  });
  await prisma.department.update({
    where: { id: facilities.id },
    data: { headId: rohan.id },
  });

  const maya = await createAuthUser({
    name: "Maya Patel",
    email: "maya@assetflow.demo",
    role: "ASSET_MANAGER",
    departmentId: engineering.id,
  });
  const vikram = await createAuthUser({
    name: "Vikram Singh",
    email: "vikram@assetflow.demo",
    role: "ASSET_MANAGER",
    departmentId: facilities.id,
  });

  const priya = await createAuthUser({
    name: "Priya Shah",
    email: "priya@assetflow.demo",
    role: "EMPLOYEE",
    departmentId: engineering.id,
  });
  const arjun = await createAuthUser({
    name: "Arjun Nair",
    email: "arjun@assetflow.demo",
    role: "EMPLOYEE",
    departmentId: engineering.id,
  });
  const raj = await createAuthUser({
    name: "Raj Kumar",
    email: "raj@assetflow.demo",
    role: "EMPLOYEE",
    departmentId: engineering.id,
  });
  const procurement = await createAuthUser({
    name: "Procurement Team",
    email: "procurement@assetflow.demo",
    role: "EMPLOYEE",
    departmentId: facilities.id,
  });
  const neha = await createAuthUser({
    name: "Neha Desai",
    email: "neha@assetflow.demo",
    role: "EMPLOYEE",
    departmentId: fieldOpsEast.id,
  });

  const laptop = await prisma.asset.create({
    data: {
      name: "Dell Laptop",
      assetTag: "AF-0114",
      serialNumber: "SN-0114",
      categoryId: electronics.id,
      departmentId: engineering.id,
      acquisitionDate: new Date("2024-03-12"),
      acquisitionCost: 85000,
      location: "Bengaluru",
      status: "ALLOCATED",
      isBookable: false,
    },
  });

  const projector = await prisma.asset.create({
    data: {
      name: "Projector",
      assetTag: "AF-0062",
      serialNumber: "SN-0062",
      categoryId: electronics.id,
      departmentId: engineering.id,
      acquisitionDate: new Date("2023-06-01"),
      acquisitionCost: 45000,
      location: "Engineering Lab",
      status: "UNDER_MAINTENANCE",
      isBookable: false,
    },
  });

  const roomB2 = await prisma.asset.create({
    data: {
      name: "Conference Room B2",
      assetTag: "AF-ROOM-B2",
      serialNumber: "SN-ROOM-B2",
      categoryId: rooms.id,
      departmentId: facilities.id,
      acquisitionDate: new Date("2022-01-01"),
      acquisitionCost: 0,
      location: "Floor B",
      status: "AVAILABLE",
      isBookable: true,
    },
  });

  const roomA1 = await prisma.asset.create({
    data: {
      name: "Conference Room A1",
      assetTag: "AF-ROOM-A1",
      serialNumber: "SN-ROOM-A1",
      categoryId: rooms.id,
      departmentId: facilities.id,
      acquisitionDate: new Date("2022-01-01"),
      acquisitionCost: 0,
      location: "Floor A",
      status: "AVAILABLE",
      isBookable: true,
    },
  });

  await prisma.asset.createMany({
    data: [
      {
        name: "Standing Desk",
        assetTag: "AF-0020",
        serialNumber: "SN-0020",
        categoryId: furniture.id,
        departmentId: engineering.id,
        acquisitionDate: new Date("2023-01-15"),
        acquisitionCost: 22000,
        location: "Engineering",
        status: "AVAILABLE",
        isBookable: false,
      },
      {
        name: "MacBook Pro",
        assetTag: "AF-0031",
        serialNumber: "SN-0031",
        categoryId: electronics.id,
        departmentId: engineering.id,
        acquisitionDate: new Date("2024-06-01"),
        acquisitionCost: 120000,
        location: "Engineering",
        status: "RESERVED",
        isBookable: false,
      },
      {
        name: "Office Chair",
        assetTag: "AF-0045",
        serialNumber: "SN-0045",
        categoryId: furniture.id,
        departmentId: facilities.id,
        acquisitionDate: new Date("2022-08-10"),
        acquisitionCost: 8000,
        location: "Facilities Store",
        status: "AVAILABLE",
        isBookable: false,
      },
      {
        name: "Field Tablet",
        assetTag: "AF-0051",
        serialNumber: "SN-0051",
        categoryId: electronics.id,
        departmentId: fieldOpsEast.id,
        acquisitionDate: new Date("2023-11-20"),
        acquisitionCost: 35000,
        location: "Field Ops East",
        status: "LOST",
        isBookable: false,
      },
      {
        name: "Legacy Printer",
        assetTag: "AF-0078",
        serialNumber: "SN-0078",
        categoryId: electronics.id,
        departmentId: facilities.id,
        acquisitionDate: new Date("2018-04-01"),
        acquisitionCost: 15000,
        location: "Facilities",
        status: "RETIRED",
        isBookable: false,
      },
      {
        name: "Old Server Rack",
        assetTag: "AF-0089",
        serialNumber: "SN-0089",
        categoryId: electronics.id,
        departmentId: engineering.id,
        acquisitionDate: new Date("2016-02-14"),
        acquisitionCost: 95000,
        location: "Server Room",
        status: "DISPOSED",
        isBookable: false,
      },
      {
        name: "Wireless Mouse",
        assetTag: "AF-0093",
        serialNumber: "SN-0093",
        categoryId: electronics.id,
        departmentId: engineering.id,
        acquisitionDate: new Date("2025-01-10"),
        acquisitionCost: 2500,
        location: "Engineering",
        status: "UNDER_MAINTENANCE",
        isBookable: false,
      },
      {
        name: "4K Monitor",
        assetTag: "AF-0101",
        serialNumber: "SN-0101",
        categoryId: electronics.id,
        departmentId: engineering.id,
        acquisitionDate: new Date("2024-09-01"),
        acquisitionCost: 28000,
        location: "Engineering",
        status: "RESERVED",
        isBookable: false,
      },
      {
        name: "Whiteboard",
        assetTag: "AF-0120",
        serialNumber: "SN-0120",
        categoryId: furniture.id,
        departmentId: facilities.id,
        acquisitionDate: new Date("2021-05-20"),
        acquisitionCost: 12000,
        location: "Floor B",
        status: "UNDER_MAINTENANCE",
        isBookable: false,
      },
      {
        name: "Handheld Scanner",
        assetTag: "AF-0133",
        serialNumber: "SN-0133",
        categoryId: electronics.id,
        departmentId: fieldOpsEast.id,
        acquisitionDate: new Date("2024-02-28"),
        acquisitionCost: 18000,
        location: "Field Ops East",
        status: "AVAILABLE",
        isBookable: false,
      },
      {
        name: "Conference Phone",
        assetTag: "AF-0144",
        serialNumber: "SN-0144",
        categoryId: electronics.id,
        departmentId: facilities.id,
        acquisitionDate: new Date("2023-03-15"),
        acquisitionCost: 22000,
        location: "Floor B",
        status: "UNDER_MAINTENANCE",
        isBookable: false,
      },
      {
        name: "Docking Station",
        assetTag: "AF-0155",
        serialNumber: "SN-0155",
        categoryId: electronics.id,
        departmentId: engineering.id,
        acquisitionDate: new Date("2024-11-01"),
        acquisitionCost: 9000,
        location: "Engineering",
        status: "ALLOCATED",
        isBookable: false,
      },
      {
        name: "Filing Cabinet",
        assetTag: "AF-0166",
        serialNumber: "SN-0166",
        categoryId: furniture.id,
        departmentId: facilities.id,
        acquisitionDate: new Date("2020-07-07"),
        acquisitionCost: 6000,
        location: "Facilities Store",
        status: "RETIRED",
        isBookable: false,
      },
      {
        name: "GPS Unit",
        assetTag: "AF-0177",
        serialNumber: "SN-0177",
        categoryId: electronics.id,
        departmentId: fieldOpsEast.id,
        acquisitionDate: new Date("2022-12-01"),
        acquisitionCost: 14000,
        location: "Field Ops East",
        status: "LOST",
        isBookable: false,
      },
      {
        name: "Company Van",
        assetTag: "AF-0199",
        serialNumber: "SN-0199",
        categoryId: vehicles.id,
        departmentId: facilities.id,
        acquisitionDate: new Date("2021-03-01"),
        acquisitionCost: 450000,
        location: "Parking Lot",
        status: "AVAILABLE",
        isBookable: true,
      },
    ],
  });

  const standingDesk = await prisma.asset.findUniqueOrThrow({
    where: { assetTag: "AF-0020" },
  });
  await prisma.asset.update({
    where: { id: standingDesk.id },
    data: { status: "ALLOCATED" },
  });
  const wirelessMouse = await prisma.asset.findUniqueOrThrow({
    where: { assetTag: "AF-0093" },
  });
  const whiteboard = await prisma.asset.findUniqueOrThrow({
    where: { assetTag: "AF-0120" },
  });
  const conferencePhone = await prisma.asset.findUniqueOrThrow({
    where: { assetTag: "AF-0144" },
  });
  const dockingStation = await prisma.asset.findUniqueOrThrow({
    where: { assetTag: "AF-0155" },
  });
  const officeChair = await prisma.asset.findUniqueOrThrow({
    where: { assetTag: "AF-0045" },
  });

  const priyaAllocation = await prisma.allocation.create({
    data: {
      assetId: laptop.id,
      holderType: "EMPLOYEE",
      holderEmployeeId: priya.id,
      allocatedAt: daysAgo(90),
      expectedReturnDate: daysAgo(11),
      status: "ACTIVE",
    },
  });

  const arjunAllocation = await prisma.allocation.create({
    data: {
      assetId: dockingStation.id,
      holderType: "EMPLOYEE",
      holderEmployeeId: arjun.id,
      allocatedAt: daysAgo(30),
      expectedReturnDate: daysFromNow(8),
      status: "ACTIVE",
    },
  });

  await prisma.allocation.create({
    data: {
      assetId: standingDesk.id,
      holderType: "EMPLOYEE",
      holderEmployeeId: raj.id,
      allocatedAt: daysAgo(14),
      expectedReturnDate: daysFromNow(30),
      status: "ACTIVE",
    },
  });

  const returnedTablet = await prisma.asset.create({
    data: {
      name: "Returned Tablet",
      assetTag: "AF-0188",
      serialNumber: "SN-0188",
      categoryId: electronics.id,
      departmentId: engineering.id,
      acquisitionDate: new Date("2023-05-01"),
      acquisitionCost: 32000,
      location: "Engineering",
      status: "AVAILABLE",
      isBookable: false,
    },
  });

  await prisma.allocation.create({
    data: {
      assetId: returnedTablet.id,
      holderType: "EMPLOYEE",
      holderEmployeeId: arjun.id,
      allocatedAt: daysAgo(400),
      actualReturnDate: daysAgo(178),
      conditionNotes: "Good condition — minor scratches on case",
      status: "RETURNED",
    },
  });

  const pendingTransfer = await prisma.transferRequest.create({
    data: {
      allocationId: priyaAllocation.id,
      fromEmployeeId: priya.id,
      toEmployeeId: arjun.id,
      reason: "Arjun needs the laptop for client demo next week",
      status: "REQUESTED",
      requestedAt: daysAgo(2),
    },
  });

  const procurementBooking = await prisma.booking.create({
    data: {
      assetId: roomB2.id,
      bookedById: procurement.id,
      startTime: atLocalTime(today, 9, 0),
      endTime: atLocalTime(today, 10, 0),
      status: "UPCOMING",
    },
  });

  const priyaBooking = await prisma.booking.create({
    data: {
      assetId: roomA1.id,
      bookedById: priya.id,
      startTime: atLocalTime(daysFromNow(1), 14, 0),
      endTime: atLocalTime(daysFromNow(1), 15, 30),
      status: "UPCOMING",
    },
  });

  await prisma.booking.create({
    data: {
      assetId: roomB2.id,
      bookedById: raj.id,
      startTime: atLocalTime(daysFromNow(3), 11, 0),
      endTime: atLocalTime(daysFromNow(3), 12, 0),
      status: "UPCOMING",
    },
  });

  await prisma.booking.create({
    data: {
      assetId: roomB2.id,
      bookedById: priya.id,
      startTime: atLocalTime(daysAgo(7), 10, 0),
      endTime: atLocalTime(daysAgo(7), 11, 0),
      status: "COMPLETED",
    },
  });

  const pendingMaintenance = await prisma.maintenanceRequest.create({
    data: {
      assetId: laptop.id,
      raisedById: priya.id,
      description: "Laptop battery drains within 30 minutes",
      priority: "HIGH",
      status: "PENDING",
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      assetId: projector.id,
      raisedById: arjun.id,
      description: "Projector bulb not turning on",
      priority: "HIGH",
      status: "APPROVED",
      approvedById: maya.id,
      approvedAt: daysAgo(3),
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      assetId: wirelessMouse.id,
      raisedById: arjun.id,
      description: "Scroll wheel stuck",
      priority: "LOW",
      status: "TECHNICIAN_ASSIGNED",
      approvedById: maya.id,
      approvedAt: daysAgo(5),
      technicianName: "Ravi Tech Services",
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      assetId: conferencePhone.id,
      raisedById: procurement.id,
      description: "No dial tone on conference phone",
      priority: "MEDIUM",
      status: "IN_PROGRESS",
      approvedById: vikram.id,
      approvedAt: daysAgo(7),
      technicianName: "Facilities Telecom",
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      assetId: whiteboard.id,
      raisedById: procurement.id,
      description: "Marker stains won't clean off",
      priority: "LOW",
      status: "RESOLVED",
      approvedById: vikram.id,
      approvedAt: daysAgo(14),
      technicianName: "Facilities Team",
      resolvedAt: daysAgo(10),
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      assetId: officeChair.id,
      raisedById: raj.id,
      description: "Chair height lever broken",
      priority: "MEDIUM",
      status: "REJECTED",
      approvedById: maya.id,
      approvedAt: daysAgo(4),
    },
  });

  const openAuditCycle = await prisma.auditCycle.create({
    data: {
      name: "Engineering Q3 Audit",
      status: "OPEN",
      scopeDepartmentId: engineering.id,
      startDate: daysAgo(11),
      endDate: daysFromNow(19),
      createdById: maya.id,
      auditors: {
        create: [{ auditorId: aditi.id }, { auditorId: maya.id }],
      },
    },
  });

  const closedAuditCycle = await prisma.auditCycle.create({
    data: {
      name: "Facilities Q2 Audit",
      status: "CLOSED",
      scopeDepartmentId: facilities.id,
      startDate: daysAgo(120),
      endDate: daysAgo(90),
      closedAt: daysAgo(88),
      createdById: vikram.id,
      auditors: {
        create: [{ auditorId: rohan.id }, { auditorId: vikram.id }],
      },
    },
  });

  const engineeringAssets = await prisma.asset.findMany({
    where: { departmentId: engineering.id },
    select: { id: true, location: true, assetTag: true },
  });

  const openVerificationByTag: Record<string, "VERIFIED" | "PENDING" | "MISSING" | "DAMAGED"> = {
    "AF-0114": "VERIFIED",
    "AF-0062": "PENDING",
    "AF-0031": "MISSING",
    "AF-0101": "DAMAGED",
  };

  for (const asset of engineeringAssets) {
    const verificationStatus = openVerificationByTag[asset.assetTag] ?? "PENDING";
    await prisma.auditItem.create({
      data: {
        auditCycleId: openAuditCycle.id,
        assetId: asset.id,
        expectedLocation: asset.location,
        verificationStatus,
        notes:
          verificationStatus === "MISSING"
            ? "Not found at expected desk"
            : verificationStatus === "DAMAGED"
              ? "Cracked screen bezel"
              : verificationStatus === "VERIFIED"
                ? "Matches asset register"
                : undefined,
        verifiedById: verificationStatus === "VERIFIED" ? aditi.id : undefined,
        verifiedAt: verificationStatus === "VERIFIED" ? daysAgo(1) : undefined,
      },
    });
  }

  const facilitiesAssets = await prisma.asset.findMany({
    where: { departmentId: facilities.id },
    select: { id: true, location: true, assetTag: true },
  });

  for (const asset of facilitiesAssets) {
    const verificationStatus =
      asset.assetTag === "AF-0078" ? "MISSING" : asset.assetTag === "AF-0120" ? "DAMAGED" : "VERIFIED";
    await prisma.auditItem.create({
      data: {
        auditCycleId: closedAuditCycle.id,
        assetId: asset.id,
        expectedLocation: asset.location,
        verificationStatus,
        notes:
          verificationStatus === "MISSING"
            ? "Printer removed during office move"
            : verificationStatus === "DAMAGED"
              ? "Frame dented"
              : "Verified during walkthrough",
        verifiedById: rohan.id,
        verifiedAt: daysAgo(89),
      },
    });
  }

  await seedNotification({
    recipientId: priya.id,
    type: "ASSET_ASSIGNED",
    message: "Dell Laptop AF-0114 has been allocated to you",
    relatedEntityType: "Allocation",
    relatedEntityId: priyaAllocation.id,
  });
  await seedNotification({
    recipientId: priya.id,
    type: "OVERDUE_RETURN_ALERT",
    message: "Return overdue for AF-0114 — expected return was 11 days ago",
    relatedEntityType: "Allocation",
    relatedEntityId: `${priyaAllocation.id}-overdue`,
  });
  await seedNotification({
    recipientId: priya.id,
    type: "BOOKING_CONFIRMED",
    message: "Conference Room A1 booked for tomorrow 2:00 PM",
    relatedEntityType: "Booking",
    relatedEntityId: priyaBooking.id,
  });
  await seedNotification({
    recipientId: arjun.id,
    type: "TRANSFER_APPROVED",
    message: "Transfer approved for AF-0188 (historical)",
    relatedEntityType: "TransferRequest",
    relatedEntityId: `${pendingTransfer.id}-history`,
    isRead: true,
  });
  await seedNotification({
    recipientId: maya.id,
    type: "MAINTENANCE_APPROVED",
    message: "You approved maintenance for AF-0062 Projector",
    relatedEntityType: "MaintenanceRequest",
    relatedEntityId: `${pendingMaintenance.id}-approved-ref`,
    isRead: true,
  });
  await seedNotification({
    recipientId: priya.id,
    type: "MAINTENANCE_REJECTED",
    message: "Maintenance request rejected for AF-0045 — use standard facilities ticket",
    relatedEntityType: "MaintenanceRequest",
    relatedEntityId: `${officeChair.id}-rejected`,
  });
  await seedNotification({
    recipientId: procurement.id,
    type: "BOOKING_REMINDER",
    message: "Reminder: Conference Room B2 starts at 9:00 AM today",
    relatedEntityType: "Booking",
    relatedEntityId: procurementBooking.id,
  });
  await seedNotification({
    recipientId: procurement.id,
    type: "BOOKING_CANCELLED",
    message: "Booking for Conference Room A1 was cancelled",
    relatedEntityType: "Booking",
    relatedEntityId: `${roomA1.id}-cancelled`,
  });
  await seedNotification({
    recipientId: maya.id,
    type: "AUDIT_DISCREPANCY_FLAGGED",
    message: 'Audit "Facilities Q2 Audit" closed with 2 discrepancies',
    relatedEntityType: "AuditCycle",
    relatedEntityId: closedAuditCycle.id,
  });
  await seedNotification({
    recipientId: aditi.id,
    type: "AUDIT_DISCREPANCY_FLAGGED",
    message: "Engineering Q3 Audit has 2 flagged items pending close",
    relatedEntityType: "AuditCycle",
    relatedEntityId: `${openAuditCycle.id}-open`,
  });

  await seedActivity({
    actorId: maya.id,
    action: "ASSET_REGISTERED",
    entityType: "Asset",
    entityId: laptop.id,
    newValue: { assetTag: "AF-0114", name: "Dell Laptop" },
    createdAt: daysAgo(120),
  });
  await seedActivity({
    actorId: maya.id,
    action: "ASSET_ALLOCATED",
    entityType: "Asset",
    entityId: laptop.id,
    newValue: { holder: "Priya Shah", assetTag: "AF-0114" },
    createdAt: daysAgo(90),
  });
  await seedActivity({
    actorId: priya.id,
    action: "TRANSFER_REQUESTED",
    entityType: "TransferRequest",
    entityId: pendingTransfer.id,
    newValue: { to: "Arjun Nair", assetTag: "AF-0114" },
    createdAt: daysAgo(2),
  });
  await seedActivity({
    actorId: priya.id,
    action: "MAINTENANCE_REQUESTED",
    entityType: "MaintenanceRequest",
    entityId: pendingMaintenance.id,
    newValue: { assetTag: "AF-0114", priority: "HIGH" },
    createdAt: daysAgo(1),
  });
  await seedActivity({
    actorId: procurement.id,
    action: "BOOKING_CREATED",
    entityType: "Booking",
    entityId: procurementBooking.id,
    newValue: { assetTag: "AF-ROOM-B2", slot: "09:00-10:00" },
    createdAt: daysAgo(3),
  });
  await seedActivity({
    actorId: admin.id,
    action: "ROLE_CHANGED",
    entityType: "User",
    entityId: maya.id,
    newValue: { role: "ASSET_MANAGER" },
    createdAt: daysAgo(200),
  });
  await seedActivity({
    actorId: vikram.id,
    action: "AUDIT_CYCLE_CLOSED",
    entityType: "AuditCycle",
    entityId: closedAuditCycle.id,
    newValue: { discrepancies: 2, missingMarkedLost: 0 },
    createdAt: daysAgo(88),
  });

  await prisma.$executeRaw`
    SELECT setval('asset_tag_seq', GREATEST(
      COALESCE((
        SELECT MAX(CAST(SUBSTRING("assetTag" FROM 4) AS INTEGER))
        FROM "Asset"
        WHERE "assetTag" ~ '^AF-[0-9]+$'
      ), 0),
      200
    ))
  `;

  const assetCount = await prisma.asset.count();

  console.log("");
  console.log("=".repeat(60));
  console.log("AssetFlow seed complete");
  console.log("=".repeat(60));
  console.log(`Assets: ${assetCount} (all 7 lifecycle states)`);
  console.log(`Password for ALL accounts: ${SEED_PASSWORD}`);
  console.log("");
  console.log("ADMIN");
  console.log("  admin@assetflow.demo          — Org setup, promote roles, analytics");
  console.log("");
  console.log("ASSET MANAGERS");
  console.log("  maya@assetflow.demo           — Engineering: allocate, audit, maintenance queue");
  console.log("  vikram@assetflow.demo         — Facilities: bookings, closed audit history");
  console.log("");
  console.log("DEPARTMENT HEADS");
  console.log("  aditi@assetflow.demo          — Engineering: transfer approvals, dept dashboard");
  console.log("  rohan@assetflow.demo          — Facilities: dept bookings, reports");
  console.log("  sana@assetflow.demo (INACTIVE)— Field Ops East (login blocked)");
  console.log("");
  console.log("EMPLOYEES");
  console.log("  priya@assetflow.demo          — Holds AF-0114 (OVERDUE), pending maintenance & transfer");
  console.log("  arjun@assetflow.demo          — Holds AF-0155 docking station, transfer target");
  console.log("  raj@assetflow.demo            — Holds AF-0020 standing desk, try allocating AF-0114 (blocked)");
  console.log("  procurement@assetflow.demo    — Room B2 booked today 9-10 (overlap demo)");
  console.log("  neha@assetflow.demo           — Field Ops East employee");
  console.log("");
  console.log("DEMO SCENARIOS");
  console.log("  1. maya → /allocation → allocate AF-0114 to raj → conflict: held by Priya");
  console.log("  2. aditi → /allocation/approvals → approve Priya → Arjun transfer");
  console.log("  3. procurement → Room B2 9-10; try 9:30-10:30 overlap → rejected");
  console.log("  4. maya → /maintenance/queue → approve Priya laptop maintenance");
  console.log("  5. aditi → /audit → Engineering Q3 → verify assets with notes");
  console.log("  priya → /notifications — inbox with assignment, overdue, booking");
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
