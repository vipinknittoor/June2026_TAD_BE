import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { AppError } from './utils/errors.util';
import { sendError } from './utils/response.util';
import authRouter from './modules/auth/auth.routes';
import userRouter from './modules/users/user.routes';
import taskRouter from './modules/tasks/task.routes';
import notificationRouter from './modules/notifications/notification.routes';
import pushRouter from './modules/notifications/push.routes';

const app = express();

// 1. Helmet for basic security headers
app.use(helmet());

// 2. CORS configuration: allow all in development, lock down in production
const corsOptions = env.NODE_ENV === 'development'
  ? { origin: '*' }
  : { origin: process.env.CORS_ORIGIN || false };
app.use(cors(corsOptions));

// 3. Morgan HTTP logger in development only
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// 4. JSON body parser
app.use(express.json());

// 5. URL-encoded body parser
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// Health Check route
app.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    environment: env.NODE_ENV
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/tasks', taskRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/push', pushRouter);

// Global Error Handler
app.use((err: unknown, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // Do not leak stack traces/error details in production
  console.error(err);
  sendError(res, 'Internal Server Error', 500);
});

export default app;
