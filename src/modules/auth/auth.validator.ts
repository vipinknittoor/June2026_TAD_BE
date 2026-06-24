import { body } from 'express-validator';

export const loginValidator = [
  body('email')
    .exists()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .exists()
    .withMessage('Password is required')
    .notEmpty()
    .withMessage('Password cannot be empty'),
];

export const refreshValidator = [
  body('refreshToken')
    .exists()
    .withMessage('Refresh token is required')
    .notEmpty()
    .withMessage('Refresh token cannot be empty')
    .isString()
    .withMessage('Refresh token must be a string'),
];
