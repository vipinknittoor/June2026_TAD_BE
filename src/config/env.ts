import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const requiredEnvVars = [
  'PORT',
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_USER',
  'MAIL_PASS',
  'MAIL_FROM',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_MAILTO',
  'NODE_ENV'
] as const;

// Fail fast if any required environment variable is missing
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  PORT: parseInt(process.env.PORT as string, 10),
  NODE_ENV: process.env.NODE_ENV as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN as string,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN as string,
  MAIL_HOST: process.env.MAIL_HOST as string,
  MAIL_PORT: parseInt(process.env.MAIL_PORT as string, 10),
  MAIL_USER: process.env.MAIL_USER as string,
  MAIL_PASS: process.env.MAIL_PASS as string,
  MAIL_FROM: process.env.MAIL_FROM as string,
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY as string,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY as string,
  VAPID_MAILTO: process.env.VAPID_MAILTO as string,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY as string | undefined,
} as const;
