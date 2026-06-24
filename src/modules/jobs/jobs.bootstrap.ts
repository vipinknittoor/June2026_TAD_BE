import cron from 'node-cron';
import { checkAcceptanceOverdue } from './acceptance-overdue.job';

export function bootstrapJobs(): void {
  console.log('[Jobs Bootstrap] Registering background cron jobs...');

  // Schedule task checks to run daily at midnight: '0 0 * * *'
  cron.schedule('0 0 * * *', async () => {
    try {
      await checkAcceptanceOverdue();
    } catch (error) {
      console.error('[Jobs Bootstrap] Error occurred during scheduled acceptance overdue run:', error);
    }
  });

  console.log('[Jobs Bootstrap] All cron jobs registered successfully');
}
