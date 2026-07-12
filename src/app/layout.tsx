import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "AssetFlow",
  description: "Enterprise Asset & Resource Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <nav className="topnav" aria-label="Primary navigation">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/allocation/approvals">Approvals</Link>
            <Link href="/booking/department">Booking</Link>
            <Link href="/org-setup">Org Setup</Link>
            <Link href="/reports">Reports</Link>
            <Link href="/assets/new">Register Asset</Link>
          </nav>
        </div>
        {children}
      </body>
    </html>
  );
}
