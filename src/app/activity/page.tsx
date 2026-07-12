import { RecentActivityFeed } from "@/components/RecentActivityFeed";
import { listRecentActivity } from "@/modules/activity/queries/activity.queries";

export default async function ActivityPage() {
  const activity = await listRecentActivity(100);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h1 className="page-title">Activity Feed</h1>
          <p className="page-subtitle">
            Append-only log of state changes across the ERP.
          </p>
        </div>
      </header>

      <section className="card">
        <RecentActivityFeed items={activity} />
      </section>
    </main>
  );
}
