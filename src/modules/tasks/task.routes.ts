import { Router } from 'express';
import * as taskController from './task.controller';
import { createTaskValidator, updateTaskValidator, autofillTaskValidator } from './task.validator';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { uploadSingle } from '../../middlewares/upload.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { Role } from '@prisma/client';

const router = Router();

// Apply authentication to all task routes
router.use(authMiddleware);

router.get('/', requireRole(Role.ADMIN), asyncHandler(taskController.getTasks));
router.get('/my', requireRole(Role.EMPLOYEE), asyncHandler(taskController.getMyTasks));
router.get('/:taskId', requireRole(Role.ADMIN, Role.EMPLOYEE), asyncHandler(taskController.getTaskById));

router.post(
  '/',
  requireRole(Role.ADMIN),
  createTaskValidator,
  validate,
  asyncHandler(taskController.createTask)
);

router.post(
  '/autofill',
  requireRole(Role.ADMIN),
  autofillTaskValidator,
  validate,
  asyncHandler(taskController.autofillTask)
);


router.put(
  '/:taskId',
  requireRole(Role.ADMIN),
  updateTaskValidator,
  validate,
  asyncHandler(taskController.updateTask)
);

router.delete('/:taskId', requireRole(Role.ADMIN), asyncHandler(taskController.deleteTask));

router.patch(
  '/:taskId/status',
  requireRole(Role.ADMIN, Role.EMPLOYEE),
  asyncHandler(taskController.patchTaskStatus)
);

router.patch('/:taskId/deny', requireRole(Role.EMPLOYEE), asyncHandler(taskController.denyTask));
router.patch('/:taskId/progress', requireRole(Role.EMPLOYEE), asyncHandler(taskController.logProgress));

router.post(
  '/:taskId/attachments',
  requireRole(Role.EMPLOYEE),
  uploadSingle,
  asyncHandler(taskController.uploadAttachment)
);

export default router;
