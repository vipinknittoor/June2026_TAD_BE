import { Router } from 'express';
import * as authController from './auth.controller';
import { loginValidator, refreshValidator } from './auth.validator';
import { validate } from '../../middlewares/validate.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/async-handler.util';

const router = Router();

router.post(
  '/login',
  loginValidator,
  validate,
  asyncHandler(authController.login)
);

router.post(
  '/refresh',
  refreshValidator,
  validate,
  asyncHandler(authController.refresh)
);

router.post(
  '/logout',
  authMiddleware,
  asyncHandler(authController.logout)
);

export default router;
