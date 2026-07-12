import { describe, expect, it } from "vitest";
import { canAccessDepartment } from "@/lib/session";

describe("department access rules", () => {
  it("allows a department head to access their own department", () => {
    expect(
      canAccessDepartment({
        role: "DEPARTMENT_HEAD",
        userDepartmentId: "engineering",
        targetDepartmentId: "engineering",
      })
    ).toBe(true);
  });

  it("blocks a department head from a forged department id", () => {
    expect(
      canAccessDepartment({
        role: "DEPARTMENT_HEAD",
        userDepartmentId: "engineering",
        targetDepartmentId: "facilities",
      })
    ).toBe(false);
  });

  it("allows asset managers and admins across departments", () => {
    expect(
      canAccessDepartment({
        role: "ASSET_MANAGER",
        userDepartmentId: null,
        targetDepartmentId: "facilities",
      })
    ).toBe(true);

    expect(
      canAccessDepartment({
        role: "ADMIN",
        userDepartmentId: null,
        targetDepartmentId: "facilities",
      })
    ).toBe(true);
  });
});
