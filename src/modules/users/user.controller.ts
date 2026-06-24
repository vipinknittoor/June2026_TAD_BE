import { Request, Response } from 'express';
import * as userService from './user.service';
import { sendSuccess } from '../../utils/response.util';
import { Role } from '@prisma/client';

export async function getUsers(req: Request, res: Response): Promise<void> {
  const queryRole = req.query.role;
  const role = (queryRole === 'ADMIN' || queryRole === 'EMPLOYEE') ? (queryRole as Role) : undefined;
  const result = await userService.getUsers(role);
  sendSuccess(res, result, 'Users retrieved successfully', 200);
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const result = await userService.createUser(req.body);
  sendSuccess(res, result, 'User created successfully', 201);
}
