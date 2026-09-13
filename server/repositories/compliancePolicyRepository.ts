import { eq, and } from 'drizzle-orm';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { ContactFrequencyRules } from '../../src/types';

/**
 * System-wide safe defaults. These are the most restrictive baseline.
 * If a tenant has no policy, these apply.
 * Tenant policies can only RELAX these within system bounds, never exceed them.
 */
export const SYSTEM_DEFAULT_POLICY: ContactFrequencyRules = {
  callCapMaxAttempts: 3,
  callCapDays: 7,
  whatsAppCapMaxAttempts: 4,
  whatsAppCapDays: 30,
  smsCapMaxAttempts: 2,
  smsCapDays: 14,
  quietHoursEnabled: true,
  quietHoursStart: '19:00',
  quietHoursEnd: '09:00',
  enforceTimezone: 'Asia/Kolkata (IST)',
  timezone: 'Asia/Kolkata',
  dncEnforcement: true,
  optOutEnforcement: true,
  pauseEnforcement: true,
  preferredChannelEnforcement: true,
  version: 1,
};

/**
 * Retrieves the compliance policy for a specific tenant.
 * Returns null if no tenant-specific policy exists.
 */
export async function findByTenantId(tenantId: string): Promise<ContactFrequencyRules | null> {
  const rows = await db
    .select()
    .from(schema.complianceRules)
    .where(eq(schema.complianceRules.tenantId, tenantId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    tenantId: row.tenantId,
    callCapMaxAttempts: row.callCapMaxAttempts,
    callCapDays: row.callCapDays,
    whatsAppCapMaxAttempts: row.whatsAppCapMaxAttempts,
    whatsAppCapDays: row.whatsAppCapDays,
    smsCapMaxAttempts: row.smsCapMaxAttempts,
    smsCapDays: row.smsCapDays,
    quietHoursEnabled: row.quietHoursEnabled,
    quietHoursStart: row.quietHoursStart,
    quietHoursEnd: row.quietHoursEnd,
    enforceTimezone: row.enforceTimezone,
    timezone: row.timezone,
    dncEnforcement: row.dncEnforcement,
    optOutEnforcement: row.optOutEnforcement,
    pauseEnforcement: row.pauseEnforcement,
    preferredChannelEnforcement: row.preferredChannelEnforcement,
    updatedAt: row.updatedAt ?? undefined,
    updatedBy: row.updatedBy ?? undefined,
    version: row.version,
  };
}

/**
 * Returns the effective policy for a tenant.
 * If the tenant has a stored policy, return it.
 * Otherwise, return system defaults with the tenant's timezone.
 */
export async function getEffectivePolicy(tenantId: string): Promise<ContactFrequencyRules> {
  const tenantPolicy = await findByTenantId(tenantId);
  if (tenantPolicy) {
    return tenantPolicy;
  }

  // Attempt to get tenant timezone
  const tenantRows = await db
    .select({ timezone: schema.tenants.timezone })
    .from(schema.tenants)
    .where(eq(schema.tenants.id, tenantId))
    .limit(1);

  const tenantTimezone = tenantRows[0]?.timezone || 'Asia/Kolkata';

  return {
    ...SYSTEM_DEFAULT_POLICY,
    tenantId,
    timezone: tenantTimezone,
  };
}

export interface PolicyConflictError {
  code: 'POLICY_VERSION_CONFLICT';
  message: string;
  currentVersion: number;
  expectedVersion: number;
}

/**
 * Upsert a tenant's compliance policy with optimistic concurrency control.
 * 
 * If expectedVersion is provided, the update will only succeed if the
 * current version matches. Otherwise, it will throw a conflict error.
 */
export async function upsert(
  tenantId: string,
  policy: Partial<ContactFrequencyRules>,
  updatedBy: string,
  expectedVersion?: number
): Promise<ContactFrequencyRules> {
  const existing = await findByTenantId(tenantId);
  const now = new Date().toISOString();

  if (existing) {
    // Optimistic concurrency check
    if (expectedVersion !== undefined && existing.version !== expectedVersion) {
      const error: PolicyConflictError = {
        code: 'POLICY_VERSION_CONFLICT',
        message: `Policy has been modified by another user. Expected version ${expectedVersion}, but current version is ${existing.version}. Please reload and try again.`,
        currentVersion: existing.version!,
        expectedVersion,
      };
      throw error;
    }

    const newVersion = (existing.version || 1) + 1;
    const merged = {
      callCapMaxAttempts: policy.callCapMaxAttempts ?? existing.callCapMaxAttempts,
      callCapDays: policy.callCapDays ?? existing.callCapDays,
      whatsAppCapMaxAttempts: policy.whatsAppCapMaxAttempts ?? existing.whatsAppCapMaxAttempts,
      whatsAppCapDays: policy.whatsAppCapDays ?? existing.whatsAppCapDays,
      smsCapMaxAttempts: policy.smsCapMaxAttempts ?? existing.smsCapMaxAttempts,
      smsCapDays: policy.smsCapDays ?? existing.smsCapDays,
      quietHoursEnabled: policy.quietHoursEnabled ?? existing.quietHoursEnabled,
      quietHoursStart: policy.quietHoursStart ?? existing.quietHoursStart,
      quietHoursEnd: policy.quietHoursEnd ?? existing.quietHoursEnd,
      enforceTimezone: policy.enforceTimezone ?? existing.enforceTimezone,
      timezone: policy.timezone ?? existing.timezone ?? 'Asia/Kolkata',
      dncEnforcement: policy.dncEnforcement ?? existing.dncEnforcement,
      optOutEnforcement: policy.optOutEnforcement ?? existing.optOutEnforcement,
      pauseEnforcement: policy.pauseEnforcement ?? existing.pauseEnforcement,
      preferredChannelEnforcement: policy.preferredChannelEnforcement ?? existing.preferredChannelEnforcement,
      updatedAt: now,
      updatedBy,
      version: newVersion,
    };

    await db
      .update(schema.complianceRules)
      .set(merged)
      .where(
        and(
          eq(schema.complianceRules.tenantId, tenantId),
          eq(schema.complianceRules.version, existing.version || 1) // Atomic CAS
        )
      );

    return { ...merged, tenantId };
  } else {
    // Insert new policy
    const defaults = SYSTEM_DEFAULT_POLICY;
    const newPolicy = {
      id: `compliance-${tenantId}-${Date.now()}`,
      tenantId,
      callCapMaxAttempts: policy.callCapMaxAttempts ?? defaults.callCapMaxAttempts,
      callCapDays: policy.callCapDays ?? defaults.callCapDays,
      whatsAppCapMaxAttempts: policy.whatsAppCapMaxAttempts ?? defaults.whatsAppCapMaxAttempts,
      whatsAppCapDays: policy.whatsAppCapDays ?? defaults.whatsAppCapDays,
      smsCapMaxAttempts: policy.smsCapMaxAttempts ?? defaults.smsCapMaxAttempts,
      smsCapDays: policy.smsCapDays ?? defaults.smsCapDays,
      quietHoursEnabled: policy.quietHoursEnabled ?? defaults.quietHoursEnabled,
      quietHoursStart: policy.quietHoursStart ?? defaults.quietHoursStart,
      quietHoursEnd: policy.quietHoursEnd ?? defaults.quietHoursEnd,
      enforceTimezone: policy.enforceTimezone ?? defaults.enforceTimezone,
      timezone: policy.timezone ?? defaults.timezone ?? 'Asia/Kolkata',
      dncEnforcement: policy.dncEnforcement ?? defaults.dncEnforcement ?? true,
      optOutEnforcement: policy.optOutEnforcement ?? defaults.optOutEnforcement ?? true,
      pauseEnforcement: policy.pauseEnforcement ?? defaults.pauseEnforcement ?? true,
      preferredChannelEnforcement: policy.preferredChannelEnforcement ?? defaults.preferredChannelEnforcement ?? true,
      updatedAt: now,
      updatedBy,
      version: 1,
    };

    await db.insert(schema.complianceRules).values(newPolicy);

    return { ...newPolicy };
  }
}

export const compliancePolicyRepository = {
  findByTenantId,
  getEffectivePolicy,
  upsert,
  SYSTEM_DEFAULT_POLICY,
};
