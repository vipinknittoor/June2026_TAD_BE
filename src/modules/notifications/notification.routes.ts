import { Router, Request, Response } from 'express';
import * as notificationService from './notification.service';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../utils/response.util';
import { asyncHandler } from '../../utils/async-handler.util';

const router = Router();

router.use(authMiddleware);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const notifications = await notificationService.getUserNotifications(userId);
    sendSuccess(res, notifications, 'Notifications retrieved successfully', 200);
  })
);

router.patch(
  '/read',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const result = await notificationService.markAllAsRead(userId);
    sendSuccess(res, result, 'All notifications marked as read', 200);
  })
);

router.patch(
  '/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const notificationId = req.params.id as string;
    const notification = await notificationService.markAsRead(notificationId, userId);
    sendSuccess(res, notification, 'Notification marked as read', 200);
  })
);

export default router;
