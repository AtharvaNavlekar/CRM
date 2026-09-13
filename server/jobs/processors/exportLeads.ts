import { Job } from 'bullmq';
import { ExportLeadsPayload } from '../types';
import { db } from '../../db/client';
import { leads } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { can } from '../../policy';
import { enforceTenantScope } from '../../tenantMiddleware';
import { auditService } from '../../services/auditService';

export async function processExportLeads(job: Job<ExportLeadsPayload>) {
  const { tenantId, securityContext, format, jobId } = job.data;

  // 1. Execution-time Authorization Re-check
  if (!(await can(securityContext, 'leads:export'))) {
    throw new Error('Authorization denied at execution time for EXPORT');
  }

  const tenantConditions = eq(leads.tenantId, tenantId!);

  // 2. Perform the export query
  const records = await db.query.leads.findMany({
    where: tenantConditions
  });

  // Simulate file generation & upload
  await new Promise(resolve => setTimeout(resolve, 1000));
  const fileUrl = `https://storage.example.com/exports/${tenantId}/${jobId}.${format}`;

  // 3. Log completion to Audit Service
  await auditService.logNormal({
    eventType: 'DATA_EXPORT_COMPLETED',
    outcome: 'SUCCESS',
    reason: `Background job exported ${records.length} leads in ${format} format`,
    securityContext,
    metadata: { jobId, actionType: 'EXPORT' }
  });

  // Return data goes into resultMetadata of the job
  return {
    success: true,
    count: records.length,
    fileUrl
  };
}
