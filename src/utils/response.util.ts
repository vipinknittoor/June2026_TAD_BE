import { Response } from 'express';

export function sendSuccess(
  res: Response,
  data: unknown = null,
  message = 'Success',
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message = 'Internal Server Error',
  statusCode = 500,
  errors?: unknown
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors !== undefined ? { errors } : {}),
  });
}
