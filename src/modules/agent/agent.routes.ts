import { Router } from 'express';
import * as agentController from './agent.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requireRole } from '../../middlewares/role.middleware';
import { asyncHandler } from '../../utils/async-handler.util';
import { Role } from '@prisma/client';

const router = Router();

// POST /api/v1/agent/query
// Protected by token verification and requires ADMIN privileges
router.post(
  '/query',
  authMiddleware,
  requireRole(Role.ADMIN),
  asyncHandler(agentController.queryAgent)
);

export default router;
