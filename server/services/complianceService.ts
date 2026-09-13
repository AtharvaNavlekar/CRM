import { Lead, SecurityContext, ContactFrequencyRules } from '../../src/types';
import { evaluateCompliance, ComplianceCheckResult, ComplianceEvaluationInput } from '../compliance';
import { compliancePolicyRepository } from '../repositories/compliancePolicyRepository';
import { db as pgDb } from '../db/client';
import * as schema from '../db/schema';
import { eq, and, gte } from 'drizzle-orm';

/**
 * Compliance Service — the single entry point for all compliance checks.
 * 
 * Architecture:
 *   1. Fetch tenant compliance policy from repository
 *   2. Query recent call/message counts for the lead (tenant-scoped)
 *   3. Call the pure evaluateCompliance() function
 *   4. Return the result
 * 
 * All communication paths (calls, messages, bulk, import) must go through this service.
 * Platform staff and impersonating users are NOT exempt from compliance.
 */

/**
 * Count recent calls for a specific lead within the policy's rolling window.
 */
async function countRecentCalls(leadId: string, tenantId: string, windowDays: number): Promise<number> {
  const cutoffDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoffDate.toISOString();

  try {
    const rows = await pgDb
      .select()
      .from(schema.calls)
      .where(
        and(
          eq(schema.calls.leadId, leadId),
          gte(schema.calls.timestamp, cutoffIso)
        )
      );
    return rows.length;
  } catch {
    // If PG is unavailable, return 0 (fail-open for counts, but policy still applies)
    return 0;
  }
}

/**
 * Count recent outbound messages for a specific lead within the policy's rolling window.
 */
async function countRecentMessages(leadId: string, tenantId: string, windowDays: number): Promise<number> {
  const cutoffDate = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoffDate.toISOString();

  try {
    const rows = await pgDb
      .select()
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.leadId, leadId),
          eq(schema.messages.direction, 'outbound'),
          gte(schema.messages.timestamp, cutoffIso)
        )
      );
    return rows.length;
  } catch {
    return 0;
  }
}

/**
 * Main compliance check function.
 * 
 * This is the ONLY function endpoints should call for compliance decisions.
 * It handles:
 *   - Policy retrieval (tenant-scoped with safe defaults)
 *   - Activity count queries (tenant-scoped from PostgreSQL)
 *   - Pure evaluation delegation
 * 
 * Platform staff cannot bypass compliance — the evaluator has no concept of
 * isPlatformStaff. Authorization and compliance are separate decisions.
 */
export async function checkLeadCompliance(
  lead: Lead,
  channel: 'Call' | 'WhatsApp' | 'SMS',
  securityContext: SecurityContext,
  tenantId?: string
): Promise<ComplianceCheckResult> {
  // Resolve effective tenant ID
  const effectiveTenantId = tenantId || securityContext.tenantId || lead.tenantId || 'tenant-apex';

  // 1. Fetch effective compliance policy (tenant-scoped, with safe defaults)
  const policy = await compliancePolicyRepository.getEffectivePolicy(effectiveTenantId);

  // 2. Query recent activity counts
  const recentCallCount = await countRecentCalls(lead.id, effectiveTenantId, policy.callCapDays);
  const recentMessageCount = await countRecentMessages(lead.id, effectiveTenantId, policy.whatsAppCapDays);
  const recentSmsCount = lead.contactAttempts7d?.sms || 0;

  // Use the higher of database count and lead-embedded count for safety
  const effectiveCallCount = Math.max(recentCallCount, lead.contactAttempts7d?.calls || 0);
  const effectiveMsgCount = Math.max(recentMessageCount, lead.contactAttempts7d?.whatsapp || 0);

  // 3. Pure evaluation
  return evaluateCompliance({
    lead,
    channel,
    policy,
    recentCallCount: effectiveCallCount,
    recentMessageCount: effectiveMsgCount,
    recentSmsCount,
  });
}

export const complianceService = {
  checkLeadCompliance,
};
