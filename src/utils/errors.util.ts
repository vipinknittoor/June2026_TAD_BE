export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export function badRequest(message = 'Bad Request'): AppError {
  return new AppError(message, 400);
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(message, 401);
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(message, 403);
}

export function notFound(message = 'Not Found'): AppError {
  return new AppError(message, 404);
}

export function conflict(message = 'Conflict'): AppError {
  return new AppError(message, 409);
}

export function internalError(message = 'Internal Server Error'): AppError {
  return new AppError(message, 500);
}
