import { body } from 'express-validator';
import { Priority, TaskStatus } from '@prisma/client';

export const createTaskValidator = [
  body('title').exists().trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
  body('description').exists().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  body('goal').exists().trim().isLength({ min: 5 }).withMessage('Goal must be at least 5 characters long'),
  body('startDate').exists().isISO8601().withMessage('Start date must be a valid ISO8601 date'),
  body('endDate').exists().isISO8601().withMessage('End date must be a valid ISO8601 date'),
  body('acceptanceCriteria').exists().trim().isLength({ min: 10 }).withMessage('Acceptance criteria must be at least 10 characters long'),
  body('priority').optional().isIn([Priority.LOW, Priority.MEDIUM, Priority.HIGH]),
  body('status').optional().isIn([TaskStatus.DRAFT, TaskStatus.ASSIGNED]),
  body('assigneeIds').optional().isArray().withMessage('Assignees must be an array of user IDs'),
  body('reviewingManagerId')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage('Reviewing manager must be a valid UUID'),
];

export const updateTaskValidator = [
  body('title').optional().trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters long'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  body('goal').optional().trim().isLength({ min: 5 }).withMessage('Goal must be at least 5 characters long'),
  body('startDate').optional().isISO8601().withMessage('Start date must be a valid ISO8601 date'),
  body('endDate').optional().isISO8601().withMessage('End date must be a valid ISO8601 date'),
  body('acceptanceCriteria').optional().trim().isLength({ min: 10 }).withMessage('Acceptance criteria must be at least 10 characters long'),
  body('priority').optional().isIn([Priority.LOW, Priority.MEDIUM, Priority.HIGH]),
  body('assigneeIds').optional().isArray().withMessage('Assignees must be an array of user IDs'),
  body('reviewingManagerId')
    .optional({ nullable: true, checkFalsy: true })
    .isUUID()
    .withMessage('Reviewing manager must be a valid UUID'),
];

export const autofillTaskValidator = [
  body('title')
    .exists()
    .trim()
    .isLength({ min: 3 })
    .withMessage('Title must be at least 3 characters long'),
];
