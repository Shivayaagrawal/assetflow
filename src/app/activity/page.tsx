import { RecentActivityFeed } from "@/components/RecentActivityFeed";
import { listRecentActivity } from "@/modules/activity/queries/activity.queries";
import { requireSessionUser } from "@/shared/auth/session";
import { ROLE_LABELS } from "@/shared/navigation/nav-config";
import type { UserRole } from "@prisma/client";

function activityScopeLabel(role: UserRole) {
  switch (role) {
    case "EMPLOYEE":
      return "Showing actions you performed (bookings, allocations, maintenance requests).";
    case "DEPARTMENT_HEAD":
      return "Showing your department's activity and actions you performed.";
    case "ASSET_MANAGER":
    case "ADMIN":
      return "Showing organization-wide activity — who registered, allocated, booked, and changed assets.";
    default:
      return "Append-only log of state changes across the ERP.";
  }
}

export default async function ActivityPage() {
  const user = await requireSessionUser();
  const activity = await listRecentActivity(100);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Audit trail</p>
          <h1 className="page-title">Activity Feed</h1>
          <p className="page-subtitle">
            {activityScopeLabel(user.role)} Signed in as{" "}
            <strong>{ROLE_LABELS[user.role]}</strong>.
          </p>
        </div>
      </header>

      <section className="card">
        <RecentActivityFeed items={activity} />
      </section>
    </main>
  );
}
