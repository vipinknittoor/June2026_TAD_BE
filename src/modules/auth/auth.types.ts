import { Role } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshPayload {
  refreshToken: string;
}
