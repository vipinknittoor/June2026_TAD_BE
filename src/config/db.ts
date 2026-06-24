import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient();

if (env.NODE_ENV === 'development') {
  console.log('Database connected');
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
}
