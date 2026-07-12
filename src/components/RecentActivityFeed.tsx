type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date | string;
  actor?: { name: string } | null;
  newValue?: unknown;
};

function formatActivityTitle(item: ActivityItem) {
  const newVal = item.newValue as Record<string, unknown> | null;
  if (newVal && typeof newVal === "object" && "description" in newVal) {
    return String(newVal.description);
  }
  return item.action.replace(/_/g, " ");
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
            {new Date(item.createdAt).toLocaleString()}
          </p>
        </article>
      ))}
    </div>
  );
}
