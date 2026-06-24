import bcrypt from 'bcrypt';
import { prisma } from '../../config/db';
import { conflict } from '../../utils/errors.util';
import { Role } from '@prisma/client';
import { CreateUserPayload, UserResponse } from './user.types';

export async function getUsers(role?: Role): Promise<UserResponse[]> {
  const where = role ? { role, isActive: true } : { isActive: true };
  return prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
    },
  });
}

export async function createUser(payload: CreateUserPayload): Promise<UserResponse> {
  const { name, email, password, role, title } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw conflict('Email is already in use');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      title: title || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
    },
  });

  return newUser;
}
