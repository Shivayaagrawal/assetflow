"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/shared/format/date";
import { getMyNotifications, getUnreadNotificationCount, markAsRead, markAllAsRead } from "@/modules/notification/actions/notification.actions";

type Notification = {
  id: string;
  type: string;
  message: string;
  createdAt: Date;
  isRead: boolean;
};

interface NotificationListProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
}

export function NotificationList({
  initialNotifications,
  initialUnreadCount,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [latestNotifs, latestCount] = await Promise.all([
          getMyNotifications(),
          getUnreadNotificationCount(),
        ]);
        setNotifications(latestNotifs);
        setUnreadCount(latestCount);
      } catch (err) {
        console.error("Failed to poll notifications", err);
      }
    }, 5000); // Poll every 5 seconds for more responsive UI testing

    return () => clearInterval(interval);
  }, []);

  async function handleMarkAsRead(id: string) {
    try {
      await markAsRead({ notificationId: id });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <section className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #d0d7de", paddingBottom: 10 }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          Inbox ({unreadCount} unread)
        </h2>
        {unreadCount > 0 && (
          <button className="secondary" onClick={handleMarkAllAsRead} style={{ padding: "6px 12px", fontSize: 12 }}>
            Mark all as read
          </button>
        )}
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
                    {formatDateTime(notif.createdAt)}
                  </small>
                </div>
                {!notif.isRead && (
                  <button
                    className="secondary"
                    onClick={() => handleMarkAsRead(notif.id)}
                    style={{ padding: "4px 8px", fontSize: 12 }}
                  >
                    Mark as read
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
