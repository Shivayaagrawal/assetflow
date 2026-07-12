import { NextResponse } from "next/server";
import { runOverdueScan } from "@/features/notifications/overdue-scan";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await runOverdueScan();
  return NextResponse.json({ success: true, data: result });
}
