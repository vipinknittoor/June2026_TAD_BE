import { prisma } from '../../config/db';
import { env } from '../../config/env';
import { TaskStatus, Priority, Role, CommentType } from '@prisma/client';
import { badRequest, notFound, forbidden } from '../../utils/errors.util';
import { dispatchNotification } from '../notifications/notification.service';
import {
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskDetailResponse
} from './task.types';

// ─────────────────────────────────────────────
// Shared Prisma select projection for task detail
// Returns the full shape required by the frontend API spec
// ─────────────────────────────────────────────
const taskDetailSelect = {
  id: true,
  title: true,
  description: true,
  goal: true,
  startDate: true,
  endDate: true,
  priority: true,
  status: true,
  effortHours: true,
  acceptanceCriteria: true,
  denialReason: true,
  actualCompletionDate: true,
  createdAt: true,
  updatedAt: true,
  assignedBy: {
    select: { id: true, name: true, email: true, role: true, title: true }
  },
  reviewingManager: {
    select: { id: true, name: true, email: true, role: true, title: true }
  },
  assignees: {
    where: { isActive: true },
    select: { id: true, name: true, email: true, role: true, title: true }
  },
  comments: {
    where: { isActive: true },
    select: {
      id: true,
      text: true,
      type: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true, role: true, title: true } }
    },
    orderBy: { createdAt: 'asc' } as const
  },
  attachments: {
    where: { isActive: true },
    select: {
      id: true,
      fileUrl: true,
      createdAt: true,
      uploadedBy: { select: { id: true, name: true, email: true, role: true, title: true } }
    },
    orderBy: { createdAt: 'asc' } as const
  },
  auditLogs: {
    where: { isActive: true },
    select: {
      id: true,
      action: true,
      createdAt: true,
      actor: { select: { id: true, name: true, email: true, role: true, title: true } }
    },
    orderBy: { createdAt: 'desc' } as const
  },
  effortLogs: {
    where: { isActive: true },
    select: {
      id: true,
      hours: true,
      note: true,
      createdAt: true,
      actor: { select: { id: true, name: true, email: true, role: true, title: true } }
    },
    orderBy: { createdAt: 'desc' } as const
  }
};

// ─────────────────────────────────────────────
// Helper: write an audit log entry
// ─────────────────────────────────────────────
async function writeAuditLog(taskId: string, actorId: string, action: string): Promise<void> {
  await prisma.auditLog.create({
    data: { taskId, actorId, action }
  });
}

// ─────────────────────────────────────────────
// 1. Get Tasks — ADMIN only, with optional filters
// ─────────────────────────────────────────────
export async function getTasksAdmin(filters: {
  status?: TaskStatus;
  priority?: Priority;
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TaskDetailResponse[]> {
  const where: any = { isActive: true };

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.priority) {
    where.priority = filters.priority;
  }
  if (filters.employeeId) {
    where.assignees = { some: { id: filters.employeeId, isActive: true } };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.endDate = {};
  }
  if (filters.dateFrom) {
    where.endDate.gte = new Date(filters.dateFrom);
  }
  if (filters.dateTo) {
    where.endDate.lte = new Date(filters.dateTo);
  }

  return prisma.task.findMany({
    where,
    select: taskDetailSelect,
    orderBy: { createdAt: 'desc' }
  });
}

// ─────────────────────────────────────────────
// 2. Get My Tasks — EMPLOYEE only (assigned, non-DRAFT)
// ─────────────────────────────────────────────
export async function getTasksEmployee(employeeId: string): Promise<TaskDetailResponse[]> {
  return prisma.task.findMany({
    where: {
      isActive: true,
      status: { not: TaskStatus.DRAFT },
      assignees: { some: { id: employeeId, isActive: true } }
    },
    select: taskDetailSelect,
    orderBy: { createdAt: 'desc' }
  });
}

// ─────────────────────────────────────────────
// 3. Get Task by ID
// ADMIN: any active task; EMPLOYEE: only their assigned non-DRAFT tasks
// ─────────────────────────────────────────────
export async function getTaskById(
  taskId: string,
  userId: string,
  role: Role
): Promise<TaskDetailResponse> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, isActive: true },
    select: taskDetailSelect
  });

  if (!task) {
    throw notFound('Task not found');
  }

  if (role === Role.EMPLOYEE) {
    const isAssignee = task.assignees.some((a) => a.id === userId);
    if (!isAssignee || task.status === TaskStatus.DRAFT) {
      throw forbidden('Unauthorized to access this task');
    }
  }

  return task;
}

// ─────────────────────────────────────────────
// 4. Create Task — ADMIN only
// ─────────────────────────────────────────────
export async function createTask(
  payload: CreateTaskPayload,
  creatorId: string
): Promise<TaskDetailResponse> {
  const {
    title,
    description,
    goal,
    startDate,
    endDate,
    priority,
    status = TaskStatus.DRAFT,
    acceptanceCriteria,
    assigneeIds = [],
    reviewingManagerId
  } = payload;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw badRequest('Start date must be less than or equal to end date');
  }

  if (status === TaskStatus.ASSIGNED) {
    if (assigneeIds.length === 0) {
      throw badRequest('At least one assignee is required to assign a task');
    }
    if (!reviewingManagerId) {
      throw badRequest('Reviewing manager is required to assign a task');
    }
  }

  // Non-nullable FK: default reviewing manager to the creator for DRAFT tasks
  const managerId = reviewingManagerId || creatorId;

  // Split into independent tasks if assigneeIds are provided
  if (assigneeIds.length > 0) {
    const createdTasks: TaskDetailResponse[] = [];

    for (const assigneeId of assigneeIds) {
      const task = await prisma.task.create({
        data: {
          title,
          description,
          goal,
          startDate: start,
          endDate: end,
          priority: priority || Priority.MEDIUM,
          status,
          acceptanceCriteria,
          assignedById: creatorId,
          reviewingManagerId: managerId,
          assignees: { connect: [{ id: assigneeId }] }
        },
        select: taskDetailSelect
      });

      await writeAuditLog(task.id, creatorId, 'Task created');

      if (status === TaskStatus.ASSIGNED) {
        await dispatchNotification(
          assigneeId,
          task.id,
          'TASK_ASSIGNED',
          `You have been assigned a new task: ${title}`
        );
      }

      createdTasks.push(task);
    }

    return createdTasks[0];
  }

  // Fallback for draft tasks or tasks created without assignees
  const task = await prisma.task.create({
    data: {
      title,
      description,
      goal,
      startDate: start,
      endDate: end,
      priority: priority || Priority.MEDIUM,
      status,
      acceptanceCriteria,
      assignedById: creatorId,
      reviewingManagerId: managerId
    },
    select: taskDetailSelect
  });

  await writeAuditLog(task.id, creatorId, 'Task created');

  return task;
}

// ─────────────────────────────────────────────
// 5. Update Task — ADMIN only (DRAFT or ASSIGNED)
// ─────────────────────────────────────────────
export async function updateTask(
  taskId: string,
  payload: UpdateTaskPayload,
  adminId: string
): Promise<TaskDetailResponse> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task || !task.isActive) {
    throw notFound('Task not found');
  }

  if (task.status !== TaskStatus.DRAFT && task.status !== TaskStatus.ASSIGNED) {
    throw badRequest('Task can only be updated when in DRAFT or ASSIGNED status');
  }

  const {
    title,
    description,
    goal,
    startDate,
    endDate,
    priority,
    acceptanceCriteria,
    assigneeIds,
    reviewingManagerId
  } = payload;

  const start = startDate ? new Date(startDate) : new Date(task.startDate);
  const end = endDate ? new Date(endDate) : new Date(task.endDate);

  if (start > end) {
    throw badRequest('Start date must be less than or equal to end date');
  }

  // Extra guard for ASSIGNED tasks
  if (task.status === TaskStatus.ASSIGNED) {
    if (assigneeIds !== undefined && assigneeIds.length === 0) {
      throw badRequest('At least one assignee is required for an assigned task');
    }
    if (reviewingManagerId === null || reviewingManagerId === '') {
      throw badRequest('Reviewing manager is required for an assigned task');
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description,
      goal,
      startDate: startDate ? start : undefined,
      endDate: endDate ? end : undefined,
      priority,
      acceptanceCriteria,
      reviewingManagerId: reviewingManagerId || undefined,
      assignees: assigneeIds
        ? { set: assigneeIds.map((id) => ({ id })) }
        : undefined
    },
    select: taskDetailSelect
  });

  await writeAuditLog(taskId, adminId, 'Edited task details');

  return updatedTask;
}

// ─────────────────────────────────────────────
// 6. Delete Task — ADMIN only, SOFT DELETE
// Only allowed for DRAFT or ASSIGNED tasks
// ─────────────────────────────────────────────
export async function deleteTask(taskId: string, adminId: string): Promise<void> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task || !task.isActive) {
    throw notFound('Task not found');
  }

  if (task.status !== TaskStatus.DRAFT && task.status !== TaskStatus.ASSIGNED) {
    throw badRequest('Task can only be deleted when in DRAFT or ASSIGNED status');
  }

  // Soft delete: set isActive = false (do NOT physically remove the row)
  await prisma.task.update({
    where: { id: taskId },
    data: { isActive: false }
  });

  await writeAuditLog(taskId, adminId, 'Task deleted');
}

// ─────────────────────────────────────────────
// 7. Patch Task Status — state machine
// ─────────────────────────────────────────────
export async function patchTaskStatus(
  taskId: string,
  newStatus: TaskStatus,
  userId: string,
  role: Role,
  note?: string
): Promise<TaskDetailResponse> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true }
  });

  if (!task || !task.isActive) {
    throw notFound('Task not found');
  }

  const isAssignee = task.assignees.some((a) => a.id === userId);
  const currentStatus = task.status;

  if (currentStatus === newStatus) {
    throw badRequest(`Task is already in status ${newStatus}`);
  }

  let updateData: any = { status: newStatus };

  if (currentStatus === TaskStatus.DRAFT && newStatus === TaskStatus.ASSIGNED) {
    if (role !== Role.ADMIN) throw forbidden('Only Admin can assign a task');
    if (task.assignees.length === 0) {
      throw badRequest('Cannot assign task: no assignees linked to this task');
    }

  } else if (currentStatus === TaskStatus.ASSIGNED && newStatus === TaskStatus.IN_PROGRESS) {
    if (role !== Role.EMPLOYEE || !isAssignee) {
      throw forbidden('Only assigned employees can accept a task');
    }

  } else if (currentStatus === TaskStatus.ASSIGNED && newStatus === TaskStatus.DENIED) {
    // Guide callers to use the dedicated deny endpoint so reason is captured
    if (role !== Role.EMPLOYEE || !isAssignee) {
      throw forbidden('Only assigned employees can deny a task');
    }
    throw badRequest('Use the PATCH /deny endpoint to deny a task with a denial reason');

  } else if (currentStatus === TaskStatus.IN_PROGRESS && newStatus === TaskStatus.SUBMITTED) {
    if (role !== Role.EMPLOYEE || !isAssignee) {
      throw forbidden('Only assigned employees can submit a task for review');
    }

  } else if (currentStatus === TaskStatus.SUBMITTED && newStatus === TaskStatus.APPROVED) {
    if (role !== Role.ADMIN) throw forbidden('Only Admin can approve a task');
    updateData.actualCompletionDate = new Date();

  } else if (currentStatus === TaskStatus.SUBMITTED && newStatus === TaskStatus.REOPENED) {
    if (role !== Role.ADMIN) throw forbidden('Only Admin can reopen a task');
    if (!note || note.trim() === '') {
      throw badRequest('A reopen note is required');
    }
    // Create REOPEN_COMMENT so it appears in the task comments list
    await prisma.comment.create({
      data: {
        taskId,
        authorId: userId,
        type: CommentType.REOPEN_COMMENT,
        text: note
      }
    });

  } else if (currentStatus === TaskStatus.REOPENED && newStatus === TaskStatus.SUBMITTED) {
    if (role !== Role.EMPLOYEE || !isAssignee) {
      throw forbidden('Only assigned employees can resubmit a task');
    }

  } else {
    throw badRequest(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    select: taskDetailSelect
  });

  await writeAuditLog(taskId, userId, `Status changed from ${currentStatus} to ${newStatus}`);

  // ── Notifications ────────────────────────────────────────────
  if (newStatus === TaskStatus.ASSIGNED) {
    for (const assignee of updatedTask.assignees) {
      await dispatchNotification(
        assignee.id, taskId, 'TASK_ASSIGNED',
        `You have been assigned to task: "${updatedTask.title}"`
      );
    }
  } else if (newStatus === TaskStatus.SUBMITTED) {
    await dispatchNotification(
      updatedTask.reviewingManager.id, taskId, 'TASK_SUBMITTED',
      `Task "${updatedTask.title}" has been submitted for review`
    );
  } else if (newStatus === TaskStatus.APPROVED) {
    for (const assignee of updatedTask.assignees) {
      await dispatchNotification(
        assignee.id, taskId, 'TASK_APPROVED',
        `Your task "${updatedTask.title}" has been approved`
      );
    }
  } else if (newStatus === TaskStatus.REOPENED) {
    for (const assignee of updatedTask.assignees) {
      await dispatchNotification(
        assignee.id, taskId, 'TASK_REOPENED',
        `Task "${updatedTask.title}" has been reopened. Note: ${note}`
      );
    }
  }

  return updatedTask;
}

// ─────────────────────────────────────────────
// 8. Deny Task — assigned EMPLOYEE only
// ─────────────────────────────────────────────
export async function denyTask(
  taskId: string,
  reason: string,
  employeeId: string
): Promise<TaskDetailResponse> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true }
  });

  if (!task || !task.isActive) {
    throw notFound('Task not found');
  }

  const isAssignee = task.assignees.some((a) => a.id === employeeId);
  if (!isAssignee) {
    throw forbidden('Only assigned employees can deny this task');
  }

  if (task.status !== TaskStatus.ASSIGNED) {
    throw badRequest('Only ASSIGNED tasks can be denied');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.DENIED,
      denialReason: reason
    },
    select: taskDetailSelect
  });

  await writeAuditLog(taskId, employeeId, 'Task denied by employee');

  await dispatchNotification(
    updatedTask.assignedBy.id,
    taskId,
    'TASK_DENIED',
    `Task "${updatedTask.title}" was denied. Reason: ${reason}`
  );

  return updatedTask;
}

// ─────────────────────────────────────────────
// 9. Log Progress / EOD Update — assigned EMPLOYEE only
// ─────────────────────────────────────────────
export async function logProgress(
  taskId: string,
  hours: number,
  note: string,
  employeeId: string
): Promise<TaskDetailResponse> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true }
  });

  if (!task || !task.isActive) {
    throw notFound('Task not found');
  }

  const isAssignee = task.assignees.some((a) => a.id === employeeId);
  if (!isAssignee) {
    throw forbidden('Only assigned employees can log progress against this task');
  }

  if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.REOPENED) {
    throw badRequest('Progress can only be logged for IN_PROGRESS or REOPENED tasks');
  }

  if (hours < 0) {
    throw badRequest('Logged hours must be zero or greater');
  }

  // Create the individual effort log entry
  await prisma.effortLog.create({
    data: { taskId, actorId: employeeId, hours, note }
  });

  // Increment the task-level cumulative effort hours
  await prisma.task.update({
    where: { id: taskId },
    data: { effortHours: { increment: hours } }
  });

  await writeAuditLog(taskId, employeeId, `Logged ${hours} effort hours`);

  const refreshedTask = await prisma.task.findFirst({
    where: { id: taskId, isActive: true },
    select: taskDetailSelect
  });

  return refreshedTask!;
}

// ─────────────────────────────────────────────
// 10. Upload Attachment — assigned EMPLOYEE only
// ─────────────────────────────────────────────
export async function uploadAttachment(
  taskId: string,
  fileUrl: string,
  filename: string,
  employeeId: string
): Promise<TaskDetailResponse> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true }
  });

  if (!task || !task.isActive) {
    throw notFound('Task not found');
  }

  const isAssignee = task.assignees.some((a) => a.id === employeeId);
  if (!isAssignee) {
    throw forbidden('Only assigned employees can upload attachments to this task');
  }

  await prisma.attachment.create({
    data: { taskId, uploadedById: employeeId, fileUrl }
  });

  await writeAuditLog(taskId, employeeId, `Attachment uploaded: ${filename}`);

  const refreshedTask = await prisma.task.findFirst({
    where: { id: taskId, isActive: true },
    select: taskDetailSelect
  });

  return refreshedTask!;
}

// ─────────────────────────────────────────────
// 11. Autofill Task Details using Gemini API
// ─────────────────────────────────────────────
export async function autofillTaskDetails(title: string) {
  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw badRequest('Gemini API key is not configured in the environment variables');
  }

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `Generate task details for a task titled: '${title}'`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          description: {
            type: 'STRING',
            description: 'Detailed explanation of the task.',
          },
          goal: {
            type: 'STRING',
            description: 'High level goal of the task.',
          },
          acceptanceCriteria: {
            type: 'STRING',
            description: 'Bulleted list of completion requirements.',
          },
          suggestedDurationDays: {
            type: 'INTEGER',
            description: 'Estimated timeline in days.',
          },
        },
        required: ['description', 'goal', 'acceptanceCriteria', 'suggestedDurationDays'],
      },
    },
  };

  const models = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
  let responseText = '';
  let lastErrorMsg = '';

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        responseText = await response.text();
        break;
      } else {
        const errText = await response.text();
        lastErrorMsg = `Gemini API error for model ${model}: ${response.statusText} - ${errText}`;
      }
    } catch (error: any) {
      lastErrorMsg = `Failed to communicate with Gemini API for model ${model}: ${error.message}`;
    }
  }

  if (!responseText) {
    throw badRequest(`AI generation failed. Details: ${lastErrorMsg}`);
  }

  try {
    const data: any = JSON.parse(responseText);


    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw badRequest('Invalid response structure received from Gemini API');
    }

    const parsedText = JSON.parse(candidateText);

    const durationDays = typeof parsedText.suggestedDurationDays === 'number'
      ? parsedText.suggestedDurationDays
      : parseInt(String(parsedText.suggestedDurationDays), 10) || 1;

    const today = new Date();
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const startDate = formatDate(today);
    const end = new Date(today);
    end.setDate(today.getDate() + durationDays);
    const endDate = formatDate(end);

    return {
      description: parsedText.description || '',
      goal: parsedText.goal || '',
      acceptanceCriteria: parsedText.acceptanceCriteria || '',
      startDate,
      endDate,
    };
  } catch (error: any) {
    if (error.statusCode) throw error; // Re-throw AppError / badRequest
    throw badRequest(`Failed to communicate with Gemini API: ${error.message}`);
  }
}

