import Link from "next/link";
import { navItemsForRole } from "@/shared/navigation/nav-config";
import type { UserRole } from "@prisma/client";

type AppNavProps = {
  role: UserRole;
};

export function AppNav({ role }: AppNavProps) {
  const items = navItemsForRole(role);

  return (
    <nav className="topnav" aria-label="Primary navigation">
      {items.map((item) => (
        <Link href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
