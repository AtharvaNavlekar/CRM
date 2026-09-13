import { Queue, JobsOptions } from 'bullmq';
import { redisService } from '../infrastructure/redis';
import { jobRepository } from '../repositories/jobRepository';
import { JobType, JobPayload } from './types';
import { SecurityContext } from '../../src/types';

// Reuse the existing Redis connection from infrastructure layer
// BullMQ requires an ioredis instance. We use the existing one.
const connection = redisService.getClient();

// Main CRM Job Queue
export const crmQueue = connection ? new Queue('crm-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 3600 * 24, // Keep for 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 3600 * 24 * 7, // Keep failed for 7 days
    }
  }
}) : null;

/**
 * Enqueue a job into BullMQ and create a durable tracking record in PostgreSQL
 */
export async function enqueueJob<T extends JobPayload>(
  type: JobType,
  securityContext: SecurityContext,
  payloadData: Omit<T, 'jobId' | 'tenantId' | 'securityContext'>,
  options?: JobsOptions
) {
  const tenantId = securityContext.tenantId;
  const createdBy = securityContext.actorUserId;
  const actingAsUserId = securityContext.actingAsUserId;

  if (!tenantId) {
    throw new Error('Cannot enqueue job without a valid tenant context.');
  }

  // 1. Create durable record in PostgreSQL
  const dbJob = await jobRepository.createJob({
    type,
    tenantId,
    createdBy,
    actingAsUserId
  });

  const fullPayload: T = {
    ...payloadData,
    jobId: dbJob.id,
    tenantId,
    securityContext
  } as unknown as T;

  if (crmQueue) {
    // 2. Add to Redis via BullMQ
    const bullJob = await crmQueue.add(type, fullPayload, options);

    // 3. Update PostgreSQL record with the BullMQ generated job ID
    await jobRepository.updateJob(dbJob.id, {
      queueJobId: bullJob.id
    });
  } else {
    // Degraded mode: immediately fail it since we cannot process it asynchronously without Redis
    // or log a warning
    console.warn(`[JOBS] Degraded mode: Job ${dbJob.id} of type ${type} enqueued in DB but not pushed to Redis.`);
  }

  return dbJob;
}
