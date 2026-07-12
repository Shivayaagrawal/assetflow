import { describe, it, expect } from "vitest";
import { AssetPolicy } from "@/modules/asset/policies/asset.policy";
import type { SessionUser } from "@/shared/types/action-result";
import type { Asset, AssetStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

const manager: SessionUser = {
  id: "m1",
  name: "Manager",
  email: "mgr@test.com",
  role: "ASSET_MANAGER",
  status: "ACTIVE",
  departmentId: null,
};

const employee: SessionUser = {
  id: "e1",
  name: "Employee",
  email: "emp@test.com",
  role: "EMPLOYEE",
  status: "ACTIVE",
  departmentId: "d1",
};

function asset(overrides: Partial<Asset> & { status: AssetStatus }): Asset {
  return {
    id: "a1",
    name: "Laptop",
    assetTag: "AF-0001",
    serialNumber: "SN1",
    categoryId: "c1",
    departmentId: null,
    acquisitionDate: new Date(),
    acquisitionCost: new Prisma.Decimal(1000),
    location: "Office",
    imageUrl: null,
    isBookable: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("AssetPolicy", () => {
  it("allows asset manager to register", () => {
    expect(AssetPolicy.canRegister(manager)).toBe(true);
  });

  it("denies employee registration", () => {
    expect(AssetPolicy.canRegister(employee)).toBe(false);
  });

  it("allows booking bookable available asset", () => {
    expect(AssetPolicy.canBook(employee, asset({ isBookable: true, status: "AVAILABLE" }))).toBe(true);
  });

  it("denies booking retired asset", () => {
    expect(AssetPolicy.canBook(employee, asset({ isBookable: true, status: "RETIRED" }))).toBe(false);
  });

  it("denies allocation when under maintenance", () => {
    expect(AssetPolicy.canAllocate(manager, asset({ status: "UNDER_MAINTENANCE" }))).toBe(false);
  });
});
