import { prisma } from '../../config/db';
import { notFound, forbidden } from '../../utils/errors.util';
import { NotificationResponse } from './notification.types';

export async function createNotification(
  userId: string,
  taskId: string | null,
  event: string,
  message: string
): Promise<NotificationResponse> {
  return prisma.notification.create({
    data: {
      userId,
      taskId,
      event,
      message,
    },
  });
}

export async function dispatchNotification(
  userId: string,
  taskId: string | null,
  event: string,
  message: string
): Promise<void> {
  await createNotification(userId, taskId, event, message);
  console.log(`[Notification Email/Push Stub] Sent to User ID: ${userId} | Task: ${taskId} | Event: ${event} | Message: ${message}`);
}

export async function getUserNotifications(userId: string): Promise<NotificationResponse[]> {
  return prisma.notification.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markAsRead(notificationId: string, userId: string): Promise<NotificationResponse> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || !notification.isActive) {
    throw notFound('Notification not found');
  }

  if (notification.userId !== userId) {
    throw forbidden('Unauthorized to read this notification');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: string): Promise<{ count: number }> {
  return prisma.notification.updateMany({
    where: { userId, read: false, isActive: true },
    data: { read: true },
  });
}
