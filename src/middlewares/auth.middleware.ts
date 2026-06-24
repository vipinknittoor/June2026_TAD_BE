import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { unauthorized } from '../utils/errors.util';
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        name: string;
        email: string;
        role: Role;
        tokenId: string;
      };
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw unauthorized('Missing or invalid token');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      userId: string;
      name: string;
      email: string;
      role: Role;
      tokenId: string;
    };

    if (!decoded.tokenId) {
      throw unauthorized('Missing or invalid token');
    }

    const activeToken = await prisma.refreshToken.findFirst({
      where: {
        userId: decoded.userId,
        accessTokenId: decoded.tokenId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!activeToken) {
      throw unauthorized('Missing or invalid token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isActive: true },
    });

    if (!user || !user.isActive) {
      throw unauthorized('User is inactive or does not exist');
    }

    req.user = decoded;
    next();
  } catch (err) {
    throw unauthorized('Missing or invalid token');
  }
}
