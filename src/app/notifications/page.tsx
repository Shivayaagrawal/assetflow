import { revalidatePath } from "next/cache";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllAsRead,
  markAsRead,
} from "@/modules/notification/actions/notification.actions";
import { requireRole } from "@/lib/session";

async function handleMarkAsRead(formData: FormData) {
  "use server";
  await markAsRead({
    notificationId: String(formData.get("notificationId")),
  });
  revalidatePath("/notifications");
}

async function handleMarkAllAsRead() {
  "use server";
  await markAllAsRead();
  revalidatePath("/notifications");
}

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
        {unreadCount > 0 && (
          <form action={handleMarkAllAsRead}>
            <button className="secondary" type="submit">
              Mark all as read
            </button>
          </form>
        )}
      </header>

      <section className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #d0d7de", paddingBottom: 10 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Inbox ({unreadCount} unread)
          </h2>
        </div>

        {notifications.length === 0 ? (
          <p className="muted" style={{ margin: "16px 0 0" }}>
            You have no notifications.
          </p>
        ) : (
          <div className="list" style={{ marginTop: 16 }}>
            {notifications.map((notif) => {
              const bg = notif.isRead ? "#fff" : "#f2f8ff";
              const borderLeft = notif.isRead ? "3px solid #d0d7de" : "3px solid #0969da";
              return (
                <article
                  key={notif.id}
                  className="list-item"
                  style={{
                    backgroundColor: bg,
                    borderLeft: borderLeft,
                    padding: "12px 16px",
                    borderRadius: "4px",
                    marginBottom: 12,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        color: "#57606a",
                        backgroundColor: "#f6f8fa",
                        padding: "2px 6px",
                        borderRadius: 3,
                        marginRight: 8,
                      }}
                    >
                      {notif.type.replace(/_/g, " ")}
                    </span>
                    <strong style={{ display: "block", marginTop: 4 }}>{notif.message}</strong>
                    <small className="muted" style={{ display: "block", marginTop: 4 }}>
                      {notif.createdAt.toLocaleString()}
                    </small>
                  </div>
                  {!notif.isRead && (
                    <form action={handleMarkAsRead}>
                      <input type="hidden" name="notificationId" value={notif.id} />
                      <button className="secondary" type="submit" style={{ padding: "4px 8px", fontSize: 12 }}>
                        Mark as read
                      </button>
                    </form>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
