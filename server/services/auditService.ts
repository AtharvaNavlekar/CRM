import { db } from '../db/client';
import { auditLogs } from '../db/schema';
import { SecurityContext } from '../../src/types';
import { AuditEventType, AuditOutcome } from '../constants/auditEvents';
import crypto from 'crypto';

interface AuditEventParams {
  eventType: AuditEventType;
  outcome: AuditOutcome;
  securityContext: SecurityContext;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  reason?: string;
  metadata?: Record<string, any>;
  tx?: any; // optional db transaction
}

const REDACTED_KEYS = new Set([
  'password', 'passwordHash', 'token', 'refreshToken', 'accessToken', 'authorization', 'secret'
]);

function sanitizeMetadata(data: any): any {
  if (!data) return undefined;
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(sanitizeMetadata);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (REDACTED_KEYS.has(key.toLowerCase()) || key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = typeof value === 'object' ? sanitizeMetadata(value) : value;
    }
  }
  return sanitized;
}

class AuditService {
  /**
   * Internal method to build the canonical audit record
   */
  private buildAuditRecord(params: AuditEventParams) {
    const { eventType, outcome, securityContext, resourceType, resourceId, action, reason, metadata } = params;

    return {
      id: `aud-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      occurredAt: new Date().toISOString(),
      requestId: securityContext.requestId || crypto.randomUUID(),
      eventType,
      outcome,
      actorUserId: securityContext.actorUserId || 'system',
      actorRole: securityContext.actorRole || 'system',
      actorTenantId: securityContext.actorTenantId || null,
      actingAsUserId: securityContext.actingAsUserId || null,
      impersonationSessionId: securityContext.impersonationSessionId || null,
      tenantId: securityContext.tenantId || null,
      resourceType: resourceType || null,
      resourceId: resourceId || null,
      action: action || null,
      reason: reason || null,
      ip: securityContext.ipAddress || null,
      userAgent: securityContext.userAgent || null,
      metadata: sanitizeMetadata(metadata) || null,
    };
  }

  /**
   * Log an event that is critical for security.
   * If this fails to write to the database, it will throw an error and fail the operation.
   */
  async logCritical(params: AuditEventParams): Promise<void> {
    const record = this.buildAuditRecord(params);
    const runner = params.tx || db;
    try {
      await runner.insert(auditLogs).values(record);
    } catch (error) {
      console.error(`[AUDIT FATAL] Failed to write critical audit event: ${params.eventType}`, error);
      throw new Error(`Security Audit Failure: Cannot verify the integrity of this operation.`);
    }
  }

  /**
   * Log a normal operational event.
   * If this fails to write to the database, it will log the error but allow the operation to continue.
   */
  async logNormal(params: AuditEventParams): Promise<void> {
    const record = this.buildAuditRecord(params);
    const runner = params.tx || db;
    try {
      await runner.insert(auditLogs).values(record);
    } catch (error) {
      // For non-critical events, we log the failure to stderr but don't fail the business operation
      console.error(`[AUDIT WARNING] Failed to write normal audit event: ${params.eventType}. Operation proceeding.`, error);
    }
  }
}

export const auditService = new AuditService();
