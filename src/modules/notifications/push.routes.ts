import { Router } from 'express';
import * as pushController from './push.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { asyncHandler } from '../../utils/async-handler.util';

const router = Router();

router.use(authMiddleware);

router.post('/subscribe', asyncHandler(pushController.subscribe));
router.delete('/subscribe', asyncHandler(pushController.unsubscribe));

export default router;
