import { formatDateTime } from "@/shared/format/date";

type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date | string;
  actor?: { name: string } | null;
  newValue?: unknown;
};

const ACTION_LABELS: Record<string, string> = {
  ASSET_REGISTERED: "registered an asset",
  ASSET_ALLOCATED: "allocated an asset",
  ASSET_RETURNED: "returned an asset",
  BOOKING_CREATED: "created a booking",
  BOOKING_CANCELLED: "cancelled a booking",
  BOOKING_RESCHEDULED: "rescheduled a booking",
  MAINTENANCE_RAISED: "raised a maintenance request",
  MAINTENANCE_APPROVED: "approved maintenance",
  MAINTENANCE_RESOLVED: "resolved maintenance",
  TRANSFER_REQUESTED: "requested a transfer",
  TRANSFER_APPROVED: "approved a transfer",
  TRANSFER_REJECTED: "rejected a transfer",
  EMPLOYEE_ROLE_UPDATED: "updated an employee role",
  AUDIT_CYCLE_CREATED: "started an audit cycle",
  AUDIT_CYCLE_CLOSED: "closed an audit cycle",
};

function formatActivityTitle(item: ActivityItem) {
  const newVal = item.newValue as Record<string, unknown> | null;
  if (newVal && typeof newVal === "object" && "description" in newVal) {
    return String(newVal.description);
  }

  const actor = item.actor?.name ?? "System";
  const actionLabel =
    ACTION_LABELS[item.action] ??
    item.action.replace(/_/g, " ").toLowerCase();
  return `${actor} ${actionLabel}`;
}

export function RecentActivityFeed({
  items,
  emptyLabel = "No activity recorded yet.",
}: {
  items: ActivityItem[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return <p className="muted" style={{ margin: 0 }}>{emptyLabel}</p>;
  }

  return (
    <div className="list">
      {items.map((item) => (
        <article className="list-item" key={item.id}>
          <strong>{formatActivityTitle(item)}</strong>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {item.entityType} · {item.actor?.name ?? "System"} ·{" "}
            {formatDateTime(item.createdAt)}
          </p>
        </article>
      ))}
    </div>
  );
}
