export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  taskId: string | null;
  event: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
