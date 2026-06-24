import { Router } from 'express';
import * as userController from './user.controller';
import { createUserValidator } from './user.validator';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth control to all user routes
router.use(authMiddleware);
router.use(requireRole(Role.ADMIN));

router.get('/', asyncHandler(userController.getUsers));
router.post('/', createUserValidator, validate, asyncHandler(userController.createUser));

export default router;
