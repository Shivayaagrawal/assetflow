import { prisma } from "../src/lib/db";

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

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
    data: { name: "Electronics" },
  });
  const furniture = await prisma.assetCategory.create({
    data: { name: "Furniture" },
  });
  const rooms = await prisma.assetCategory.create({
    data: { name: "Conference Rooms" },
  });

  await createAuthUser({
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
  await createAuthUser({
    name: "Procurement Team",
    email: "procurement@assetflow.demo",
    role: "EMPLOYEE",
    departmentId: facilities.id,
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

  const extraAssets = await prisma.asset.createMany({
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
        status: "AVAILABLE",
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
        status: "AVAILABLE",
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
        status: "AVAILABLE",
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
        status: "AVAILABLE",
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
    ],
  });

  const allocation = await prisma.allocation.create({
    data: {
      assetId: laptop.id,
      holderType: "EMPLOYEE",
      holderEmployeeId: priya.id,
      allocatedAt: new Date("2026-03-12"),
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
      allocatedAt: new Date("2025-06-01"),
      actualReturnDate: new Date("2026-01-15"),
      conditionNotes: "good",
      status: "RETURNED",
    },
  });

  const procurement = await prisma.user.findUnique({
    where: { email: "procurement@assetflow.demo" },
  });

  await prisma.booking.create({
    data: {
      assetId: roomB2.id,
      bookedById: procurement!.id,
      startTime: new Date("2026-07-12T09:00:00+05:30"),
      endTime: new Date("2026-07-12T10:00:00+05:30"),
      status: "UPCOMING",
    },
  });

  await prisma.maintenanceRequest.create({
    data: {
      assetId: projector.id,
      raisedById: priya.id,
      description: "Projector bulb not turning on",
      priority: "HIGH",
      status: "PENDING",
    },
  });

  const auditCycle = await prisma.auditCycle.create({
    data: {
      name: "Engineering Q3 Audit",
      status: "OPEN",
      scopeDepartmentId: engineering.id,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-07-31"),
      createdById: maya.id,
      auditors: {
        create: [{ auditorId: aditi.id }, { auditorId: sana.id }],
      },
    },
  });

  const engineeringAssets = await prisma.asset.findMany({
    where: { departmentId: engineering.id },
    select: { id: true, location: true, assetTag: true },
  });

  const verificationByTag: Record<string, "VERIFIED" | "PENDING" | "MISSING" | "DAMAGED"> = {
    "AF-0114": "VERIFIED",
    "AF-0062": "PENDING",
    "AF-0031": "MISSING",
    "AF-0101": "DAMAGED",
  };

  for (const asset of engineeringAssets) {
    const verificationStatus = verificationByTag[asset.assetTag] ?? "PENDING";
    await prisma.auditItem.create({
      data: {
        auditCycleId: auditCycle.id,
        assetId: asset.id,
        expectedLocation: asset.location,
        verificationStatus,
        verifiedById: verificationStatus === "VERIFIED" ? aditi.id : undefined,
        verifiedAt: verificationStatus === "VERIFIED" ? new Date() : undefined,
      },
    });
  }

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

  const assetCount = 3 + extraAssets.count + 1;
  console.log("Seed complete.");
  console.log(`  ${assetCount} assets across all 7 lifecycle states`);
  console.log("Demo logins (password: " + SEED_PASSWORD + "):");
  console.log("  admin@assetflow.demo — ADMIN");
  console.log("  maya@assetflow.demo — ASSET_MANAGER");
  console.log("  aditi@assetflow.demo — DEPARTMENT_HEAD (Engineering)");
  console.log("  sana@assetflow.demo — DEPARTMENT_HEAD (Field Ops East, INACTIVE)");
  console.log("  rohan@assetflow.demo — DEPARTMENT_HEAD (Facilities)");
  console.log("  priya@assetflow.demo — EMPLOYEE (AF-0114 allocated)");
  console.log("  arjun@assetflow.demo — EMPLOYEE (past return, condition: good)");
  console.log("  procurement@assetflow.demo — EMPLOYEE (Room B2 booking)");
  console.log("  Room B2 booked 09:00-10:00 for overlap tests");
  console.log(`  Active allocation id: ${allocation.id}`);
  console.log(`  Open audit cycle: ${auditCycle.name} (${auditCycle.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
