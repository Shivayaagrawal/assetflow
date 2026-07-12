/**
 * Seed script — populate mockup cast for demo walkthrough.
 * Run: npx prisma db seed
 *
 * See docs/execution-plan.md § Seed Data for the full cast list.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // TODO: implement seed data per docs/execution-plan.md
  // Departments: Engineering, Field Ops (East), Facilities
  // Assets: AF-0114, AF-0062, Conference Room B2, etc.
  console.log("Seed placeholder — implement before 11:00 AM gate");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
