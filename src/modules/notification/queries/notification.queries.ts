import { requireSessionUser } from "@/shared/auth/session";
import { NotificationRepository } from "@/modules/notification/repositories/notification.repository";

export async function listMyNotifications() {
  const user = await requireSessionUser();
  const repo = new NotificationRepository();
  const [notifications, unreadCount] = await Promise.all([
    repo.listForRecipient(user.id),
    repo.countUnread(user.id),
  ]);
  return { notifications, unreadCount };
}
