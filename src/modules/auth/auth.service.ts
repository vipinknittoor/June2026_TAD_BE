import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { unauthorized } from '../../utils/errors.util';
import { LoginPayload, TokenPayload, AuthTokens } from './auth.types';

type RefreshTokenPayload = jwt.JwtPayload & {
  userId?: string;
};

type GeneratedAuthTokens = AuthTokens & {
  accessTokenId: string;
};

function generateAccessToken(user: TokenPayload, accessTokenId: string): string {
  return jwt.sign(
    {
      userId: user.userId,
      name: user.name,
      email: user.email,
      role: user.role,
      tokenId: accessTokenId,
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  );
}

function getRefreshTokenExpiresAt(refreshToken: string): Date {
  const decoded = jwt.decode(refreshToken) as RefreshTokenPayload | null;
  if (!decoded?.exp) {
    throw unauthorized('Invalid refresh token');
  }

  return new Date(decoded.exp * 1000);
}

export function generateTokens(user: TokenPayload): GeneratedAuthTokens {
  const accessTokenId = randomUUID();
  const accessToken = generateAccessToken(user, accessTokenId);

  const refreshToken = jwt.sign(
    {
      userId: user.userId,
      tokenId: randomUUID(),
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    }
  );

  return { accessToken, refreshToken, accessTokenId };
}

export async function login(payload: LoginPayload): Promise<AuthTokens> {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw unauthorized('Invalid email or password');
  }

  const tokens = generateTokens({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: tokens.refreshToken,
      accessTokenId: tokens.accessTokenId,
      expiresAt: getRefreshTokenExpiresAt(tokens.refreshToken),
    },
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  let decoded: RefreshTokenPayload;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (err) {
    throw unauthorized('Invalid or expired refresh token');
  }

  if (!decoded.userId) {
    throw unauthorized('Invalid refresh token');
  }

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!tokenRecord) {
    throw unauthorized('Refresh token not found');
  }

  if (!tokenRecord.isActive) {
    throw unauthorized('Invalid refresh token');
  }

  if (tokenRecord.userId !== decoded.userId) {
    throw unauthorized('Invalid refresh token');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw unauthorized('Refresh token expired');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw unauthorized('User not found');
  }

  const tokens = generateTokens({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  await prisma.$transaction(async (tx) => {
    const oldToken = await tx.refreshToken.updateMany({
      where: {
        token: refreshToken,
        isActive: true,
      },
      data: { isActive: false },
    });

    if (oldToken.count !== 1) {
      throw unauthorized('Invalid refresh token');
    }

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        accessTokenId: tokens.accessTokenId,
        expiresAt: getRefreshTokenExpiresAt(tokens.refreshToken),
      },
    });
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function logout(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      isActive: true,
    },
    data: { isActive: false },
  });
}
