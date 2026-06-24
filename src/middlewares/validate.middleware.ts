import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { sendError } from '../utils/response.util';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => {
      let field = '';
      if (err.type === 'field') {
        field = err.path;
      }
      return {
        field,
        message: err.msg,
      };
    });

    sendError(res, 'Validation Error', 400, formattedErrors);
    return;
  }
  next();
}
