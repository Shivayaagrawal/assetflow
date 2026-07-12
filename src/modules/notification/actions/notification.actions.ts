"use server";

import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/shared/auth/session";
import { runAction } from "@/shared/validation/run-action";
import { throwOnFailure } from "@/shared/validation/unwrap-action";
import { z } from "zod";

const notificationIdSchema = z.object({
  notificationId: z.string().min(1),
});

export async function getMyNotificationsAction() {
  return runAction(async () => {
    const user = await requireSessionUser();
    return prisma.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
    });
  });
}

export async function getUnreadNotificationCountAction() {
  return runAction(async () => {
    const user = await requireSessionUser();
    return prisma.notification.count({
      where: { recipientId: user.id, isRead: false },
    });
  });
}

export async function markAsReadAction(input: unknown) {
  return runAction(async () => {
    const user = await requireSessionUser();
    const { notificationId } = notificationIdSchema.parse(input);

    return prisma.notification.update({
      where: { id: notificationId, recipientId: user.id },
      data: { isRead: true },
    });
  });
}

export async function markAllAsReadAction() {
  return runAction(async () => {
    const user = await requireSessionUser();

    return prisma.notification.updateMany({
      where: { recipientId: user.id, isRead: false },
      data: { isRead: true },
    });
  });
}

export async function getMyNotifications() {
  return throwOnFailure(await getMyNotificationsAction());
}

export async function getUnreadNotificationCount() {
  return throwOnFailure(await getUnreadNotificationCountAction());
}

export async function markAsRead(input: unknown) {
  return throwOnFailure(await markAsReadAction(input));
}

export async function markAllAsRead() {
  return throwOnFailure(await markAllAsReadAction());
}
