import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { LogoutButton } from "@/components/LogoutButton";
import { UserIdentity } from "@/components/UserIdentity";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";
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
  const sessionUser = session
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, status: true },
      })
    : null;
  const activeUser =
    sessionUser?.status === "ACTIVE" ? sessionUser : null;

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
          {activeUser ? (
            <>
              <AppNav role={activeUser.role as UserRole} />
              <div className="topbar-actions">
                <UserIdentity userId={activeUser.id} />
                <LogoutButton />
              </div>
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
