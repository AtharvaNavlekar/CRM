import { Job } from 'bullmq';
import { ImportLeadsPayload } from '../types';
import { db } from '../../db/client';
import { leads } from '../../db/schema';
import { can } from '../../policy';
import { auditService } from '../../services/auditService';
import { complianceService } from '../../services/complianceService';
import crypto from 'crypto';

export async function processImportLeads(job: Job<ImportLeadsPayload>) {
  const { tenantId, securityContext, leads: rawLeads, jobId } = job.data;

  // 1. Execution-time Authorization Re-check
  if (!(await can(securityContext, 'leads:create'))) {
    throw new Error('Authorization denied at execution time for IMPORT');
  }


  const importedLeads = [];
  const errors = [];
  let processed = 0;

  for (const item of rawLeads) {
    try {
      if (!item.name || !item.phone) {
        throw new Error('Name and Phone are required fields');
      }

      // Check if lead already exists (simple phone + tenantId idempotency check)
      const existing = await db.query.leads.findFirst({
        where: (l, { eq, and }) => and(eq(l.tenantId, tenantId), eq(l.phone, String(item.phone).trim()))
      });

      if (existing) {
        errors.push({ phone: item.phone, error: 'Lead with this phone already exists in tenant' });
        continue;
      }

      const importedOptOut = item.isOptedOut === true || item.optedOut === true;
      const importedBlocked = item.blockedReason?.trim() || '';
      const importedPaused = item.isPaused30Days === true || item.paused === true;

      const newLead = {
        id: crypto.randomUUID(),
        tenantId,
        name: String(item.name).trim(),
        phone: String(item.phone).trim(),
        source: String(item.source || 'csv_import').trim(),
        stage: String(item.stage || 'New').trim(),
        assignedRepId: securityContext.actorUserId,
        assignedRepName: securityContext.actorRole,
        createdDate: new Date().toISOString(),
        notes: String(item.notes || 'Imported via CSV batch upload.').trim(),
        industry: item.industry ? String(item.industry).trim() : null,
        email: item.email ? String(item.email).trim() : null,
        isOptedOut: importedOptOut,
        isPaused30Days: importedPaused,
        blockedReason: importedBlocked || undefined
      };

      const [inserted] = await db.insert(leads).values(newLead).returning();
      importedLeads.push(inserted);
    } catch (err: any) {
      errors.push({ phone: item.phone, error: err.message });
    }

    processed++;
    if (processed % 10 === 0) {
      await job.updateProgress(Math.floor((processed / rawLeads.length) * 100));
    }
  }

  // 3. Log completion to Audit Service
  await auditService.logNormal({
    eventType: 'CSV_BULK_IMPORT',
    outcome: 'SUCCESS',
    reason: `Background job imported ${importedLeads.length} leads. ${errors.length} failed.`,
    securityContext,
    metadata: { jobId, actionType: 'EDIT' }
  });

  return {
    success: true,
    importedCount: importedLeads.length,
    errorCount: errors.length,
    errors
  };
}
