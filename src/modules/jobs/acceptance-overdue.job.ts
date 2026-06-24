import { prisma } from '../../config/db';
import { TaskStatus } from '@prisma/client';
import { dispatchNotification } from '../notifications/notification.service';

/**
 * Periodically checks for overdue tasks and dispatches notifications.
 */
export async function checkAcceptanceOverdue(): Promise<void> {
  const now = new Date();

  console.log(`[Job] Starting overdue tasks check at ${now.toISOString()}`);

  try {
    // 1. Check for tasks overdue for acceptance (ASSIGNED past startDate)
    const acceptanceOverdueTasks = await prisma.task.findMany({
      where: {
        status: TaskStatus.ASSIGNED,
        startDate: {
          lt: now,
        },
        isActive: true,
      },
      include: {
        assignees: {
          where: { isActive: true },
        },
      },
    });

    console.log(`[Job] Found ${acceptanceOverdueTasks.length} tasks overdue for acceptance`);

    for (const task of acceptanceOverdueTasks) {
      for (const assignee of task.assignees) {
        await dispatchNotification(
          assignee.id,
          task.id,
          'TASK_OVERDUE_REMINDER',
          `Task "${task.title}" is overdue for acceptance. Please accept or deny the task.`
        );
      }
    }

    // 2. Check for general task overdue flags (ASSIGNED, IN_PROGRESS, REOPENED past endDate)
    const generalOverdueTasks = await prisma.task.findMany({
      where: {
        status: {
          in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REOPENED],
        },
        endDate: {
          lt: now,
        },
        isActive: true,
      },
      include: {
        assignees: {
          where: { isActive: true },
        },
      },
    });

    console.log(`[Job] Found ${generalOverdueTasks.length} general overdue tasks`);

    for (const task of generalOverdueTasks) {
      // Notify Assignees
      for (const assignee of task.assignees) {
        await dispatchNotification(
          assignee.id,
          task.id,
          'TASK_OVERDUE_FLAG',
          `Task "${task.title}" is overdue.`
        );
      }

      // Notify Reviewing Manager
      if (task.reviewingManagerId) {
        await dispatchNotification(
          task.reviewingManagerId,
          task.id,
          'TASK_OVERDUE_FLAG',
          `Task "${task.title}" is overdue.`
        );
      }
    }

    console.log('[Job] Overdue tasks check completed successfully');
  } catch (error) {
    console.error('[Job] Error occurred during overdue tasks check:', error);
    throw error;
  }
}
