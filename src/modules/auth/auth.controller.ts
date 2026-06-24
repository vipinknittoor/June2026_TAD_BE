import { Request, Response } from 'express';
import * as authService from './auth.service';
import { sendSuccess } from '../../utils/response.util';

export async function login(req: Request, res: Response): Promise<void> {
  const result = await authService.login(req.body);
  sendSuccess(res, result, 'Login successful', 200);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  sendSuccess(res, result, 'Token refreshed successfully', 200);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.user!.userId);
  sendSuccess(res, { message: 'Logged out successfully' }, 'Logout successful', 200);
}
