import {
  getMyNotifications,
  getUnreadNotificationCount,
} from "@/modules/notification/actions/notification.actions";
import { requireRole } from "@/lib/session";
import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
  await requireRole("EMPLOYEE", "ASSET_MANAGER", "ADMIN");

  const [notifications, unreadCount] = await Promise.all([
    getMyNotifications(),
    getUnreadNotificationCount(),
  ]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">User Space</p>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            Stay updated with your asset assignments, transfers, and maintenance updates.
          </p>
        </div>
      </header>

      <NotificationList
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
    </main>
  );
}
