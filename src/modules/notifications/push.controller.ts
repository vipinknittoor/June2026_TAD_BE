import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response.util';

export async function subscribe(req: Request, res: Response): Promise<void> {
  console.log('Push subscription registered:', req.body);
  sendSuccess(res, null, 'Push subscription registered successfully', 201);
}

export async function unsubscribe(req: Request, res: Response): Promise<void> {
  console.log('Push subscription removed:', req.body);
  sendSuccess(res, null, 'Push subscription removed successfully', 200);
}
