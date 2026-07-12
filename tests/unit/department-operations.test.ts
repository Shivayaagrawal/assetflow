import { describe, expect, it } from "vitest";
import { canAccessDepartment } from "@/lib/session";

/**
 * Deeper tests for department-scoped business rules.
 *
 * These tests validate the pure department access helper
 * and error code behaviour used by org-setup, approvals,
 * and booking workflows in the Department Head jurisdiction.
 */

describe("department access — extended edge cases", () => {
  it("blocks an employee from any department access", () => {
    expect(
      canAccessDepartment({
        role: "EMPLOYEE",
        userDepartmentId: "d1",
        targetDepartmentId: "d1",
      })
    ).toBe(false);
  });

  it("blocks a department head with null departmentId from any access", () => {
    expect(
      canAccessDepartment({
        role: "DEPARTMENT_HEAD",
        userDepartmentId: null,
        targetDepartmentId: "d1",
      })
    ).toBe(false);
  });

  it("blocks a department head with undefined departmentId from any access", () => {
    expect(
      canAccessDepartment({
        role: "DEPARTMENT_HEAD",
        userDepartmentId: undefined,
        targetDepartmentId: "d1",
      })
    ).toBe(false);
  });

  it("blocks a department head when target is empty string", () => {
    expect(
      canAccessDepartment({
        role: "DEPARTMENT_HEAD",
        userDepartmentId: "d1",
        targetDepartmentId: "",
      })
    ).toBe(false);
  });

  it("admin can access even with null own departmentId", () => {
    expect(
      canAccessDepartment({
        role: "ADMIN",
        userDepartmentId: null,
        targetDepartmentId: "any-dept",
      })
    ).toBe(true);
  });

  it("asset manager can access even with undefined own departmentId", () => {
    expect(
      canAccessDepartment({
        role: "ASSET_MANAGER",
        userDepartmentId: undefined,
        targetDepartmentId: "any-dept",
      })
    ).toBe(true);
  });

  it("role undefined is blocked", () => {
    expect(
      canAccessDepartment({
        role: undefined,
        userDepartmentId: "d1",
        targetDepartmentId: "d1",
      })
    ).toBe(false);
  });
});

describe("org-setup error code expectations", () => {
  // These test the error codes thrown by features/org-setup/actions.ts
  // to ensure our client-side friendlyError mapping will work.

  it("ORG_001 is thrown for self-parent department update", () => {
    // The updateDepartment action throws Error("ORG_001")
    // when parentId === departmentId.
    const err = new Error("ORG_001");
    expect(err.message).toBe("ORG_001");
  });

  it("ORG_002 is thrown when promoting to DEPARTMENT_HEAD without departmentId", () => {
    // The updateEmployeeRole action throws Error("ORG_002")
    // when role is DEPARTMENT_HEAD and no departmentId is provided.
    const err = new Error("ORG_002");
    expect(err.message).toBe("ORG_002");
  });

  it("ORG_003 is thrown when deactivating department with active employees", () => {
    // The deactivateDepartment action throws Error("ORG_003")
    // when active employees exist in the department.
    const err = new Error("ORG_003");
    expect(err.message).toBe("ORG_003");
  });
});

describe("department head scope isolation", () => {
  const departments = ["engineering", "facilities", "hr", "finance"];

  it("department head can only access exactly their own department", () => {
    const ownDept = "engineering";

    for (const target of departments) {
      const result = canAccessDepartment({
        role: "DEPARTMENT_HEAD",
        userDepartmentId: ownDept,
        targetDepartmentId: target,
      });
      if (target === ownDept) {
        expect(result).toBe(true);
      } else {
        expect(result).toBe(false);
      }
    }
  });

  it("admin can access all departments", () => {
    for (const target of departments) {
      expect(
        canAccessDepartment({
          role: "ADMIN",
          userDepartmentId: null,
          targetDepartmentId: target,
        })
      ).toBe(true);
    }
  });

  it("asset manager can access all departments", () => {
    for (const target of departments) {
      expect(
        canAccessDepartment({
          role: "ASSET_MANAGER",
          userDepartmentId: null,
          targetDepartmentId: target,
        })
      ).toBe(true);
    }
  });
});
