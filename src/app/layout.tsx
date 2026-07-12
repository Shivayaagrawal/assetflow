import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { LogoutButton } from "@/components/LogoutButton";
import { auth } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssetFlow",
  description: "Enterprise Asset & Resource Management",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  return (
    <html lang="en">
      <body>
        <div className="topbar">
          <Link className="brand" href="/">
            <span className="brand-mark">AF</span>
            <span>
              <strong>AssetFlow</strong>
              <small>Operations Console</small>
            </span>
          </Link>
          {session ? (
            <>
              <nav className="topnav" aria-label="Primary navigation">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/allocation/my">My Allocations</Link>
                <Link href="/booking">Book Resource</Link>
                <Link href="/maintenance">Maintenance</Link>
                <Link href="/maintenance/queue">Maint. Queue</Link>
                <Link href="/audit">Audit</Link>
                <Link href="/allocation/approvals">Approvals</Link>
                <Link href="/booking/department">Dept Booking</Link>
                <Link href="/org-setup">Org Setup</Link>
                <Link href="/reports">Reports</Link>
                <Link href="/notifications">Notifications</Link>
                <Link href="/activity">Activity</Link>
                <Link href="/assets/new">Register Asset</Link>
              </nav>
              <LogoutButton />
            </>
          ) : (
            <nav className="topnav" aria-label="Authentication">
              <Link href="/login">Sign in</Link>
              <Link href="/signup">Sign up</Link>
            </nav>
          )}
        </div>
        {children}
      </body>
    </html>
  );
}
