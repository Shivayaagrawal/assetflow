import { describe, it, expect } from "vitest";
import { AllocationPolicy } from "@/modules/allocation/policies/allocation.policy";
import type { SessionUser } from "@/shared/types/action-result";

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

describe("AllocationPolicy", () => {
  it("allows asset manager to allocate", () => {
    expect(AllocationPolicy.canAllocate(manager)).toBe(true);
  });

  it("denies employee allocation", () => {
    expect(AllocationPolicy.canAllocate(employee)).toBe(false);
  });

  it("allows active employee to return", () => {
    expect(AllocationPolicy.canReturn(employee)).toBe(true);
  });
});
