import { NextResponse } from "next/server";
import { getReportsOverview } from "@/modules/reporting/queries/dashboard.query";

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
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
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="assetflow-reports.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
