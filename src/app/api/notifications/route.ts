import { NextResponse } from "next/server";
import { listMyNotifications } from "@/modules/notification/queries/notification.queries";
import { toActionError } from "@/shared/errors/app-error";

export async function GET() {
  try {
    const data = await listMyNotifications();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const mapped = toActionError(error);
    return NextResponse.json(
      { success: false, error: { code: mapped.code, message: mapped.message } },
      { status: mapped.httpStatus }
    );
  }
}
