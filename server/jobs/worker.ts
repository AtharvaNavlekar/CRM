import { Worker, Job } from 'bullmq';
import { redisService } from '../infrastructure/redis';
import { jobRepository } from '../repositories/jobRepository';
import { JobType, JobPayload } from './types';
import { processExportLeads } from './processors/exportLeads';
import { processImportLeads } from './processors/importLeads';
import { processBulkUpdate } from './processors/bulkUpdate';
import * as dotenv from 'dotenv';
dotenv.config();

const connection = redisService.getClient();

// Ensure db and other services that might lazy load are initialized
import '../db/client';

console.log('Starting DialPulse CRM Background Worker...');

if (!connection) {
  console.log('Running in degraded mode without Redis. Background worker shutting down safely.');
  process.exit(0);
}

const worker = new Worker<JobPayload>(
  'crm-jobs',
  async (job: Job<JobPayload>) => {
    console.log(`[Worker] Processing job ${job.id} of type ${job.name}`);
    const jobId = job.data.jobId;

    try {
      await jobRepository.updateJob(jobId, {
        status: 'RUNNING',
        startedAt: new Date().toISOString()
      });

      let result;
      switch (job.name as JobType) {
        case 'EXPORT_LEADS':
          result = await processExportLeads(job as any);
          break;
        case 'IMPORT_LEADS':
          result = await processImportLeads(job as any);
          break;
        case 'BULK_UPDATE_LEADS':
          result = await processBulkUpdate(job as any);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      await jobRepository.updateJob(jobId, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        resultMetadata: result
      });

      console.log(`[Worker] Job ${job.id} completed successfully`);
      return result;

    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error);
      
      const failedData = {
        status: 'FAILED',
        failedAt: new Date().toISOString(),
        errorDetails: {
          message: error.message,
          stack: error.stack
        }
      };
      
      // If BullMQ will retry it, mark it as retrying
      if (job.attemptsMade < (job.opts.attempts || 1)) {
        failedData.status = 'RETRYING';
      }

      await jobRepository.updateJob(jobId, failedData as any);
      throw error;
    }
  },
  {
    connection,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  }
);

worker.on('failed', (job, err) => {
  console.log(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});

worker.on('error', (err) => {
  console.error('[Worker] Unexpected error', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});
