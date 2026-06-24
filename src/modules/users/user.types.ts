import { Role } from '@prisma/client';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
  title?: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string | null;
}
