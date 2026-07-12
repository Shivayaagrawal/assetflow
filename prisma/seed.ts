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
}) {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      emailVerified: true,
      role: input.role,
      status: "ACTIVE",
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
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  const engineering = await prisma.department.create({
    data: { name: "Engineering", status: "ACTIVE" },
  });
  const facilities = await prisma.department.create({
    data: { name: "Facilities", status: "ACTIVE" },
  });
  const fieldOps = await prisma.department.create({
    data: { name: "Field Ops", status: "ACTIVE" },
  });
  await prisma.department.create({
    data: {
      name: "Field Ops (East)",
      status: "ACTIVE",
      parentId: fieldOps.id,
    },
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

  const admin = await createAuthUser({
    name: "Admin User",
    email: "admin@assetflow.demo",
    role: "ADMIN",
  });
  const assetManager = await createAuthUser({
    name: "Arjun Nair",
    email: "arjun@assetflow.demo",
    role: "ASSET_MANAGER",
    departmentId: engineering.id,
  });
  const deptHead = await createAuthUser({
    name: "Aditi Rao",
    email: "aditi@assetflow.demo",
    role: "DEPARTMENT_HEAD",
    departmentId: engineering.id,
  });
  await prisma.department.update({
    where: { id: engineering.id },
    data: { headId: deptHead.id },
  });
  const priya = await createAuthUser({
    name: "Priya Shah",
    email: "priya@assetflow.demo",
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
      location: "bengaluru",
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
      acquisitionDate: new Date("2023-06-01"),
      acquisitionCost: 45000,
      location: "Engineering",
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
      acquisitionDate: new Date("2022-01-01"),
      acquisitionCost: 0,
      location: "Floor B",
      status: "AVAILABLE",
      isBookable: true,
    },
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
      createdById: assetManager.id,
      auditors: {
        create: [{ auditorId: deptHead.id }, { auditorId: assetManager.id }],
      },
    },
  });

  const engineeringAssets = await prisma.asset.findMany({
    where: { departmentId: engineering.id },
    select: { id: true, location: true },
  });

  for (const asset of engineeringAssets) {
    await prisma.auditItem.create({
      data: {
        auditCycleId: auditCycle.id,
        assetId: asset.id,
        expectedLocation: asset.location,
        verificationStatus: asset.id === laptop.id ? "VERIFIED" : "PENDING",
        verifiedById: asset.id === laptop.id ? deptHead.id : undefined,
        verifiedAt: asset.id === laptop.id ? new Date() : undefined,
      },
    });
  }

  // Align sequence above seeded numeric tags so nextval() cannot collide
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

  console.log("Seed complete.");
  console.log("Demo logins (password: " + SEED_PASSWORD + "):");
  console.log("  admin@assetflow.demo — ADMIN");
  console.log("  arjun@assetflow.demo — ASSET_MANAGER");
  console.log("  aditi@assetflow.demo — DEPARTMENT_HEAD");
  console.log("  priya@assetflow.demo — EMPLOYEE (AF-0114 allocated)");
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
