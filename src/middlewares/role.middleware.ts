import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Role } from '@prisma/client';
import { forbidden, unauthorized } from '../utils/errors.util';

export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw unauthorized('Missing or invalid token');
    }

    if (!roles.includes(req.user.role)) {
      throw forbidden('Unauthorized role access');
    }

    next();
  };
}
