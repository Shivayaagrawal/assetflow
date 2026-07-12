import type { UserRole } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  roles: UserRole[] | "all";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: "all" },
  { href: "/assets", label: "Assets", roles: "all" },
  { href: "/allocation/my", label: "My Allocations", roles: ["EMPLOYEE"] },
  { href: "/booking", label: "Book Resource", roles: "all" },
  {
    href: "/maintenance",
    label: "Maintenance",
    roles: ["EMPLOYEE", "ASSET_MANAGER", "ADMIN"],
  },
  {
    href: "/maintenance/queue",
    label: "Maint. Queue",
    roles: ["ASSET_MANAGER", "ADMIN", "DEPARTMENT_HEAD"],
  },
  { href: "/audit", label: "Audit", roles: "all" },
  { href: "/allocation", label: "Allocation", roles: ["ASSET_MANAGER", "ADMIN"] },
  {
    href: "/allocation/approvals",
    label: "Approvals",
    roles: ["DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"],
  },
  {
    href: "/booking/department",
    label: "Dept Booking",
    roles: ["DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"],
  },
  { href: "/org-setup", label: "Org Setup", roles: ["ADMIN"] },
  {
    href: "/reports",
    label: "Reports",
    roles: ["DEPARTMENT_HEAD", "ASSET_MANAGER", "ADMIN"],
  },
  {
    href: "/notifications",
    label: "Notifications",
    roles: ["EMPLOYEE", "ASSET_MANAGER", "ADMIN"],
  },
  { href: "/activity", label: "Activity", roles: "all" },
  {
    href: "/assets/new",
    label: "Register Asset",
    roles: ["ASSET_MANAGER", "ADMIN"],
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: "Employee",
  DEPARTMENT_HEAD: "Department Head",
  ASSET_MANAGER: "Asset Manager",
  ADMIN: "Admin",
};

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.roles === "all" || item.roles.includes(role)
  );
}
