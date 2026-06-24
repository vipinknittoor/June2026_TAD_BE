import { Request, Response } from 'express';
import * as taskService from './task.service';
import { sendSuccess } from '../../utils/response.util';
import { Role, TaskStatus, Priority } from '@prisma/client';
import { badRequest } from '../../utils/errors.util';

function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTaskResponse(task: any): any {
  if (!task) return task;
  return {
    ...task,
    startDate: formatDate(task.startDate),
    endDate: formatDate(task.endDate),
  };
}

function formatTasksResponse(tasks: any[]): any[] {
  return tasks.map(formatTaskResponse);
}

// GET /tasks  — Admin gets all tasks with optional filters
export async function getTasks(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const filters = {
    // Accept both documented query param names and legacy ones
    status: req.query.status && req.query.status !== 'ALL'
      ? (req.query.status as TaskStatus)
      : undefined,
    priority: req.query.priority && req.query.priority !== 'ALL'
      ? (req.query.priority as Priority)
      : undefined,
    employeeId: (req.query.employeeId || req.query.assigneeId) as string | undefined,
    dateFrom:   (req.query.dateFrom  || req.query.startDate)  as string | undefined,
    dateTo:     (req.query.dateTo    || req.query.endDate)    as string | undefined,
  };
  const result = await taskService.getTasksAdmin(filters);
  sendSuccess(res, formatTasksResponse(result), 'Tasks retrieved successfully');
}

// GET /tasks/my  — Employee gets their own tasks
export async function getMyTasks(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const result = await taskService.getTasksEmployee(user.userId);
  sendSuccess(res, formatTasksResponse(result), 'My tasks retrieved successfully');
}

// GET /tasks/:taskId  — Admin or assigned employee
export async function getTaskById(req: Request, res: Response): Promise<void> {
  const taskId = req.params.taskId as string;
  const user = req.user!;
  const result = await taskService.getTaskById(taskId, user.userId, user.role);
  sendSuccess(res, formatTaskResponse(result), 'Task details retrieved successfully');
}

// POST /tasks  — Admin creates a draft or assigned task
export async function createTask(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const result = await taskService.createTask(req.body, user.userId);
  sendSuccess(res, formatTaskResponse(result), 'Task created successfully', 201);
}

// PUT /tasks/:taskId  — Admin edits a task
export async function updateTask(req: Request, res: Response): Promise<void> {
  const taskId = req.params.taskId as string;
  const user = req.user!;
  const result = await taskService.updateTask(taskId, req.body, user.userId);
  sendSuccess(res, formatTaskResponse(result), 'Task updated successfully');
}

// DELETE /tasks/:taskId  — Admin soft-deletes a task (204 No Content)
export async function deleteTask(req: Request, res: Response): Promise<void> {
  const taskId = req.params.taskId as string;
  const user = req.user!;
  await taskService.deleteTask(taskId, user.userId);
  res.status(204).send();
}

// PATCH /tasks/:taskId/status  — Transition task status
export async function patchTaskStatus(req: Request, res: Response): Promise<void> {
  const taskId = req.params.taskId as string;
  const { status, note } = req.body;
  const user = req.user!;

  if (!status) {
    throw badRequest('status field is required');
  }

  const result = await taskService.patchTaskStatus(
    taskId,
    status as TaskStatus,
    user.userId,
    user.role,
    note
  );
  sendSuccess(res, formatTaskResponse(result), `Task status updated to ${status}`);
}

// PATCH /tasks/:taskId/deny  — Assigned employee denies a task
export async function denyTask(req: Request, res: Response): Promise<void> {
  const taskId = req.params.taskId as string;
  const { reason } = req.body;
  const user = req.user!;

  if (!reason || reason.trim() === '') {
    throw badRequest('Denial reason is required');
  }
  if (reason.trim().length < 10) {
    throw badRequest('Denial reason must be at least 10 characters long');
  }

  const result = await taskService.denyTask(taskId, reason, user.userId);
  sendSuccess(res, formatTaskResponse(result), 'Task denied successfully');
}

// PATCH /tasks/:taskId/progress  — Assigned employee logs EOD progress
export async function logProgress(req: Request, res: Response): Promise<void> {
  const taskId = req.params.taskId as string;
  // Accept both "notes" (API spec) and "note" (legacy)
  const note  = req.body.notes ?? req.body.note;
  // Accept both "effortHours" (API spec) and "hours" (legacy)
  const hours = req.body.effortHours ?? req.body.hours;
  const user = req.user!;

  if (hours === undefined || hours === null) {
    throw badRequest('effortHours field is required');
  }
  if (!note || String(note).trim() === '') {
    throw badRequest('notes field is required');
  }

  const parsedHours = parseFloat(String(hours));
  if (isNaN(parsedHours)) {
    throw badRequest('effortHours must be a valid number');
  }

  const result = await taskService.logProgress(taskId, parsedHours, note, user.userId);
  sendSuccess(res, formatTaskResponse(result), 'Progress logged successfully');
}

// POST /tasks/:taskId/attachments  — Assigned employee uploads a file
export async function uploadAttachment(req: Request, res: Response): Promise<void> {
  const taskId = req.params.taskId as string;
  const user = req.user!;

  if (!req.file) {
    throw badRequest('No file uploaded');
  }

  // Build a stable, publicly accessible URL using the static /uploads route
  const fileUrl = `/uploads/${req.file.filename}`;

  const result = await taskService.uploadAttachment(
    taskId,
    fileUrl,
    req.file.originalname,
    user.userId
  );
  sendSuccess(res, formatTaskResponse(result), 'Attachment uploaded successfully');
}

// POST /tasks/autofill — Generate details for a task based on its title
export async function autofillTask(req: Request, res: Response): Promise<void> {
  const { title } = req.body;
  const result = await taskService.autofillTaskDetails(title);
  sendSuccess(res, result, 'Task details generated successfully');
}

