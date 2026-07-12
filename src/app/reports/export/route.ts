import { NextResponse } from "next/server";
import { getReportsOverview } from "@/modules/reporting/queries/dashboard.query";
import { requireSessionUserStrict } from "@/shared/auth/session";
import { toActionError } from "@/shared/errors/app-error";

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    await requireSessionUserStrict();
    const reports = await getReportsOverview();
    const rows = [
      ["Section", "Label", "Value", "Location"],
      ...reports.utilizationByDepartment.map((item) => [
        "Utilization by department",
        item.departmentName,
        item.count,
        "",
      ]),
      ...reports.mostUsedAssets.map((item) => [
        "Most used assets",
        item.assetName,
        item.count,
        item.location,
      ]),
      ...reports.idleAssets.map((asset) => [
        "Idle assets",
        `${asset.assetTag} - ${asset.name}`,
        asset.updatedAt.toISOString(),
        asset.location,
      ]),
      ...reports.maintenanceFrequency.map((item) => [
        "Maintenance Frequency",
        item.assetName,
        item.count,
        item.location,
      ]),
      ["Audit Report", "Verified", reports.auditReport.verified, ""],
      ["Audit Report", "Missing", reports.auditReport.missing, ""],
      ["Audit Report", "Damaged", reports.auditReport.damaged, ""],
      ["Audit Report", "Pending verification", reports.auditReport.pending, ""],
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Disposition": 'attachment; filename="assetflow-reports.csv"',
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    const mapped = toActionError(error);
    return NextResponse.json(
      { success: false, error: { code: mapped.code, message: mapped.message } },
      { status: mapped.httpStatus }
    );
  }
}
