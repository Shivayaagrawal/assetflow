import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/org-setup",
  "/assets",
  "/allocation",
  "/booking",
  "/maintenance",
  "/audit",
  "/reports",
  "/notifications",
  "/activity",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/org-setup/:path*",
    "/assets/:path*",
    "/allocation/:path*",
    "/booking/:path*",
    "/maintenance/:path*",
    "/audit/:path*",
    "/reports/:path*",
    "/notifications/:path*",
    "/activity/:path*",
  ],
};
