import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/config/db';

async function main() {
  await prisma.$connect();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    }
  });
  console.log('--- ALL USERS ---');
  console.log(JSON.stringify(users, null, 2));

  const tasks = await prisma.task.findMany({
    select: {
      id: true,
      title: true,
      isActive: true,
      assignees: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  });
  console.log('--- ALL TASKS ---');
  console.log(JSON.stringify(tasks, null, 2));

  await prisma.$disconnect();
}

main().catch(console.error);
