import { body } from 'express-validator';
import { Role } from '@prisma/client';

export const allowedUserTitles = [
  'Software Developer',
  'Software Associate',
  'DevOps Engineer',
  'QA Engineer',
  'UI/UX Designer',
  'Product Manager',
  'Project Manager',
  'Business Analyst',
  'Intern',
] as const;

export const createUserValidator = [
  body('name')
    .exists()
    .withMessage('Name is required')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('email')
    .exists()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .exists()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .exists()
    .withMessage('Role is required')
    .isIn([Role.ADMIN, Role.EMPLOYEE])
    .withMessage('Role must be either ADMIN or EMPLOYEE'),
  body('title')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(allowedUserTitles)
    .withMessage('Title must be one of the allowed values'),
];
