import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ success: true, data: { status: "ok", db: "connected" } });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "GEN_003", message: "Database unavailable" } },
      { status: 503 }
    );
  }
}
