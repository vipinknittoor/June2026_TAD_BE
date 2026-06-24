import app from './app';
import { env } from './config/env';
import { prisma, disconnectDB } from './config/db';
import { bootstrapJobs } from './modules/jobs/jobs.bootstrap';

const server = app.listen(env.PORT, async () => {
  console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`Local URL: http://localhost:${env.PORT}`);
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (err) {
    console.error('Failed to connect to the database on startup:', err);
    process.exit(1);
  }
  bootstrapJobs();
});

async function handleGracefulShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await disconnectDB();
      console.log('Database connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database disconnection:', err);
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => {
  handleGracefulShutdown('SIGTERM').catch((err) => {
    console.error('Error handling SIGTERM:', err);
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  handleGracefulShutdown('SIGINT').catch((err) => {
    console.error('Error handling SIGINT:', err);
    process.exit(1);
  });
});
