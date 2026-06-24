import { Priority, TaskStatus, CommentType } from '@prisma/client';

export interface TaskUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string | null;
}

export interface TaskCommentResponse {
  id: string;
  text: string;
  type: CommentType;
  createdAt: Date;
  author: TaskUserResponse;
}

export interface TaskAttachmentResponse {
  id: string;
  fileUrl: string;
  createdAt: Date;
  uploadedBy: TaskUserResponse;
}

export interface TaskAuditLogResponse {
  id: string;
  action: string;
  createdAt: Date;
  actor: TaskUserResponse;
}

export interface TaskEffortLogResponse {
  id: string;
  hours: number;
  note: string;
  createdAt: Date;
  actor: TaskUserResponse;
}

export interface TaskDetailResponse {
  id: string;
  title: string;
  description: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  priority: Priority;
  status: TaskStatus;
  effortHours: number;
  acceptanceCriteria: string;
  denialReason: string | null;
  actualCompletionDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedBy: TaskUserResponse;
  reviewingManager: TaskUserResponse;
  assignees: TaskUserResponse[];
  comments: TaskCommentResponse[];
  attachments: TaskAttachmentResponse[];
  auditLogs: TaskAuditLogResponse[];
  effortLogs: TaskEffortLogResponse[];
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  goal: string;
  startDate: string;
  endDate: string;
  priority?: Priority;
  status?: TaskStatus;
  acceptanceCriteria: string;
  assigneeIds?: string[];
  reviewingManagerId?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  priority?: Priority;
  acceptanceCriteria?: string;
  assigneeIds?: string[];
  reviewingManagerId?: string;
}
