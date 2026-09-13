import { db } from '../db/client';
import { jobs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

export const jobRepository = {
  async createJob(params: {
    type: string;
    tenantId: string;
    createdBy: string;
    actingAsUserId?: string;
  }) {
    const [job] = await db.insert(jobs).values({
      id: crypto.randomUUID(),
      type: params.type,
      status: 'QUEUED',
      tenantId: params.tenantId,
      createdBy: params.createdBy,
      actingAsUserId: params.actingAsUserId || null,
      createdAt: new Date().toISOString()
    }).returning();
    return job;
  },

  async updateJob(id: string, updates: Partial<typeof jobs.$inferInsert>) {
    const [job] = await db.update(jobs)
      .set(updates)
      .where(eq(jobs.id, id))
      .returning();
    return job;
  },

  async getJobById(id: string, tenantId: string) {
    const job = await db.query.jobs.findFirst({
      where: (j, { and, eq }) => and(eq(j.id, id), eq(j.tenantId, tenantId))
    });
    return job;
  },

  async listTenantJobs(tenantId: string) {
    return await db.query.jobs.findMany({
      where: eq(jobs.tenantId, tenantId),
      orderBy: [desc(jobs.createdAt)],
      limit: 50
    });
  }
};
