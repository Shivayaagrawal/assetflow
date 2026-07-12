import { describe, it, expect } from "vitest";
import { DepartmentPolicy } from "@/modules/organization/policies/department.policy";
import type { SessionUser } from "@/shared/types/action-result";
import { AuthorizationError } from "@/shared/errors/app-error";

const admin: SessionUser = {
  id: "u-admin",
  name: "Admin",
  email: "admin@test.com",
  role: "ADMIN",
  status: "ACTIVE",
  departmentId: null,
};

const manager: SessionUser = {
  id: "u-mgr",
  name: "Manager",
  email: "mgr@test.com",
  role: "ASSET_MANAGER",
  status: "ACTIVE",
  departmentId: null,
};

const deptHead: SessionUser = {
  id: "u-head",
  name: "Dept Head",
  email: "head@test.com",
  role: "DEPARTMENT_HEAD",
  status: "ACTIVE",
  departmentId: "d-engineering",
};

const employee: SessionUser = {
  id: "u-emp",
  name: "Employee",
  email: "emp@test.com",
  role: "EMPLOYEE",
  status: "ACTIVE",
  departmentId: "d-engineering",
};

describe("DepartmentPolicy", () => {
  describe("canManage", () => {
    it("allows admin to manage", () => {
      expect(DepartmentPolicy.canManage(admin)).toBe(true);
    });

    it("denies asset manager to manage", () => {
      expect(DepartmentPolicy.canManage(manager)).toBe(false);
    });

    it("denies department head to manage", () => {
      expect(DepartmentPolicy.canManage(deptHead)).toBe(false);
    });

    it("denies employee to manage", () => {
      expect(DepartmentPolicy.canManage(employee)).toBe(false);
    });
  });

  describe("canViewDepartment", () => {
    it("allows admin to view any department", () => {
      expect(DepartmentPolicy.canViewDepartment(admin, "d-engineering")).toBe(true);
      expect(DepartmentPolicy.canViewDepartment(admin, "d-hr")).toBe(true);
    });

    it("allows asset manager to view any department", () => {
      expect(DepartmentPolicy.canViewDepartment(manager, "d-engineering")).toBe(true);
      expect(DepartmentPolicy.canViewDepartment(manager, "d-hr")).toBe(true);
    });

    it("allows department head to view their own department", () => {
      expect(DepartmentPolicy.canViewDepartment(deptHead, "d-engineering")).toBe(true);
    });

    it("denies department head from viewing other departments", () => {
      expect(DepartmentPolicy.canViewDepartment(deptHead, "d-hr")).toBe(false);
    });

    it("allows employee to view their own department", () => {
      expect(DepartmentPolicy.canViewDepartment(employee, "d-engineering")).toBe(true);
    });

    it("denies employee from viewing other departments", () => {
      expect(DepartmentPolicy.canViewDepartment(employee, "d-hr")).toBe(false);
    });
  });

  describe("assertions", () => {
    it("assertCanManage does not throw for admin", () => {
      expect(() => DepartmentPolicy.assertCanManage(admin)).not.toThrow();
    });

    it("assertCanManage throws AuthorizationError for non-admin", () => {
      expect(() => DepartmentPolicy.assertCanManage(deptHead)).toThrow(AuthorizationError);
    });

    it("assertCanViewDepartment does not throw for permitted user", () => {
      expect(() => DepartmentPolicy.assertCanViewDepartment(deptHead, "d-engineering")).not.toThrow();
    });

    it("assertCanViewDepartment throws AuthorizationError for denied user", () => {
      expect(() => DepartmentPolicy.assertCanViewDepartment(deptHead, "d-hr")).toThrow(AuthorizationError);
    });
  });
});
