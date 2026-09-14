import { Lead, ContactFrequencyRules, SecurityContext } from '../src/types';
import { compliancePolicyRepository, SYSTEM_DEFAULT_POLICY } from './repositories/compliancePolicyRepository';

export interface ComplianceCheckResult {
  allowed: boolean;
  statusCode?: number; // 403 Forbidden or 429 Too Many Requests
  code?: string;
  reason?: string;
  details?: {
    channel: 'Call' | 'WhatsApp' | 'SMS';
    leadId: string;
    leadName: string;
    ruleViolated: string;
    attemptCount?: number;
    capLimit?: number;
    timeWindowDays?: number;
    currentLocalTime?: string;
    quietHoursWindow?: string;
  };
}

/**
 * Returns the current time in the specified IANA timezone.
 * Falls back to 'Asia/Kolkata' if the timezone is invalid.
 */
export function getLocalTime(date: Date = new Date(), timezone: string = 'Asia/Kolkata'): { hours: number; minutes: number; timeString: string } {
  let tz = timezone;
  try {
    // Validate the timezone by attempting to use it
    new Intl.DateTimeFormat('en-GB', { timeZone: tz }).format(date);
  } catch {
    tz = 'Asia/Kolkata'; // Safe fallback
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const hourPart = parts.find(p => p.type === 'hour')?.value || '00';
  const minPart = parts.find(p => p.type === 'minute')?.value || '00';
  const hours = parseInt(hourPart, 10);
  const minutes = parseInt(minPart, 10);
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { hours, minutes, timeString };
}

/**
 * Checks whether the specified timestamp falls within configured quiet hours
 * using the tenant's timezone.
 */
export function isQuietHours(
  rules: ContactFrequencyRules,
  date: Date = new Date(),
  timezone?: string
): { isQuiet: boolean; currentLocalTime: string; window: string } {
  if (!rules.quietHoursEnabled) {
    return { isQuiet: false, currentLocalTime: '', window: '' };
  }

  const tz = timezone || rules.timezone || 'Asia/Kolkata';
  const { hours, minutes, timeString } = getLocalTime(date, tz);
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = (rules.quietHoursStart || '19:00').split(':').map(Number);
  const [endH, endM] = (rules.quietHoursEnd || '09:00').split(':').map(Number);
  const startMinutes = (startH || 19) * 60 + (startM || 0);
  const endMinutes = (endH || 9) * 60 + (endM || 0);

  let isQuiet = false;
  if (startMinutes > endMinutes) {
    // Spans across midnight, e.g. 19:00 (7 PM) to 09:00 (9 AM)
    isQuiet = currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Within same calendar day, e.g. 13:00 to 15:00
    isQuiet = currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return {
    isQuiet,
    currentLocalTime: timeString,
    window: `${rules.quietHoursStart || '19:00'} - ${rules.quietHoursEnd || '09:00'} (${tz})`
  };
}

/**
 * Pure compliance evaluation function.
 * 
 * IMPORTANT: This function has NO side effects and makes NO database calls.
 * All inputs are explicit. This makes it deterministic, testable, and reviewable.
 * 
 * The separation of concerns is:
 *   CompliancePolicyRepository → fetches policy
 *   ComplianceService → counts recent activity
 *   evaluateCompliance() → pure decision
 */
export interface ComplianceEvaluationInput {
  lead: Lead;
  channel: 'Call' | 'WhatsApp' | 'SMS';
  policy: ContactFrequencyRules;
  recentCallCount: number;
  recentMessageCount: number;
  recentSmsCount: number;
  timestamp?: Date;
}

export function evaluateCompliance(input: ComplianceEvaluationInput): ComplianceCheckResult {
  const { lead, channel, policy, recentCallCount, recentMessageCount, recentSmsCount } = input;
  const targetDate = input.timestamp || new Date();

  if (!lead) {
    return {
      allowed: false,
      statusCode: 404,
      code: 'LEAD_NOT_FOUND',
      reason: 'Lead not found for compliance verification.'
    };
  }

  const timezone = policy.timezone || 'Asia/Kolkata';

  // 1. Explicit Do-Not-Contact / Global Opt-Out Check
  // This is a system-level safety rule that cannot be overridden
  const isOptedOut = Boolean(lead.preferences?.isOptedOut || (lead as any).isOptedOut);
  if (isOptedOut && (policy.optOutEnforcement !== false)) {
    const optOutReason = lead.preferences?.optOutReason ? ` Reason: ${lead.preferences.optOutReason}` : '';
    return {
      allowed: false,
      statusCode: 403,
      code: 'LEAD_OPTED_OUT',
      reason: `Outreach blocked: Lead has explicitly opted out of communications.${optOutReason}`,
      details: {
        channel,
        leadId: lead.id,
        leadName: lead.name,
        ruleViolated: 'LEAD_OPTED_OUT'
      }
    };
  }

  // 2. Explicit Blocked / DNC Reason on Lead
  const blockedReason = lead.blockedReason || lead.preferences?.blockedReason;
  if (blockedReason && blockedReason.trim().length > 0 && (policy.dncEnforcement !== false)) {
    return {
      allowed: false,
      statusCode: 403,
      code: 'DNC',
      reason: `Outreach blocked: Contact is on do-not-contact list.`,
      details: {
        channel,
        leadId: lead.id,
        leadName: lead.name,
        ruleViolated: 'DNC'
      }
    };
  }

  // 3. 30-Day Temporary Pause / Snooze
  if (lead.preferences?.isPaused30Days && (policy.pauseEnforcement !== false)) {
    let isStillPaused = true;
    if (lead.preferences.pausedUntil) {
      const pausedUntilDate = new Date(lead.preferences.pausedUntil);
      if (!isNaN(pausedUntilDate.getTime()) && targetDate.getTime() > pausedUntilDate.getTime()) {
        isStillPaused = false;
      }
    }
    if (isStillPaused) {
      const pausedUntilMsg = lead.preferences.pausedUntil ? ` until ${lead.preferences.pausedUntil}` : ' for 30 days';
      return {
        allowed: false,
        statusCode: 403,
        code: 'PAUSED',
        reason: `Outreach blocked: Lead communications are temporarily paused${pausedUntilMsg}.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'PAUSED'
        }
      };
    }
  }

  // 4. Preferred Channel Enforcement
  if (lead.preferences?.preferredChannel && lead.preferences.preferredChannel !== 'Any' && (policy.preferredChannelEnforcement !== false)) {
    const preferred = lead.preferences.preferredChannel;
    if (preferred !== channel) {
      return {
        allowed: false,
        statusCode: 403,
        code: 'CHANNEL_RESTRICTED',
        reason: `Channel violation: Lead requested outreach via ${preferred} only.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'CHANNEL_RESTRICTED'
        }
      };
    }
  }

  // 5. Fatigue Status Hard-Cap
  const isFatigueCapped = lead.fatigueStatus === 'capped' || (lead.preferences as any)?.fatigueStatus === 'capped';
  if (isFatigueCapped) {
    return {
      allowed: false,
      statusCode: 429,
      code: 'FATIGUE_CAP_EXCEEDED',
      reason: `Fatigue guardrail: Lead has reached maximum contact frequency cap.`,
      details: {
        channel,
        leadId: lead.id,
        leadName: lead.name,
        ruleViolated: 'FATIGUE_CAP_EXCEEDED'
      }
    };
  }

  // 6. Rolling Window Frequency Caps per Channel
  if (channel === 'Call') {
    if (recentCallCount >= policy.callCapMaxAttempts) {
      return {
        allowed: false,
        statusCode: 429,
        code: 'FREQUENCY_CAP',
        reason: `Contact frequency cap reached: Maximum ${policy.callCapMaxAttempts} calls per ${policy.callCapDays} days exceeded.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'FREQUENCY_CAP',
          attemptCount: recentCallCount,
          capLimit: policy.callCapMaxAttempts,
          timeWindowDays: policy.callCapDays
        }
      };
    }
  } else if (channel === 'WhatsApp') {
    if (recentMessageCount >= policy.whatsAppCapMaxAttempts) {
      return {
        allowed: false,
        statusCode: 429,
        code: 'FREQUENCY_CAP',
        reason: `Contact frequency cap reached: Maximum ${policy.whatsAppCapMaxAttempts} WhatsApp messages per ${policy.whatsAppCapDays} days exceeded.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'FREQUENCY_CAP',
          attemptCount: recentMessageCount,
          capLimit: policy.whatsAppCapMaxAttempts,
          timeWindowDays: policy.whatsAppCapDays
        }
      };
    }
  } else if (channel === 'SMS') {
    if (recentSmsCount >= policy.smsCapMaxAttempts) {
      return {
        allowed: false,
        statusCode: 429,
        code: 'FREQUENCY_CAP',
        reason: `Contact frequency cap reached: Maximum ${policy.smsCapMaxAttempts} SMS per ${policy.smsCapDays} days exceeded.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'FREQUENCY_CAP',
          attemptCount: recentSmsCount,
          capLimit: policy.smsCapMaxAttempts,
          timeWindowDays: policy.smsCapDays
        }
      };
    }
  }

  // 7. Quiet Hours Restrictions (using tenant timezone)
  const quietCheck = isQuietHours(policy, targetDate, timezone);
  if (quietCheck.isQuiet) {
    return {
      allowed: false,
      statusCode: 403,
      code: 'QUIET_HOURS',
      reason: `Quiet hours active (${quietCheck.window}). Current time: ${quietCheck.currentLocalTime}. Commercial outreach during quiet hours is restricted.`,
      details: {
        channel,
        leadId: lead.id,
        leadName: lead.name,
        ruleViolated: 'QUIET_HOURS',
        currentLocalTime: quietCheck.currentLocalTime,
        quietHoursWindow: quietCheck.window
      }
    };
  }

  return { allowed: true };
}

// ────────────────────────────────────────────────────────
// Backward-compatible exports
// These wrap the pure evaluator for callers that haven't migrated
// to the complianceService yet.
// ────────────────────────────────────────────────────────

import { db } from './db/client';
import { calls, messages } from './db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { getComplianceRules, DEFAULT_FREQUENCY_RULES } from './db';

/**
 * Legacy wrapper: fetches policy and counts internally, then calls the pure evaluator.
 * New code should use complianceService.checkLeadCompliance() instead.
 */
export async function checkCompliance(
  lead: Lead,
  channel: 'Call' | 'WhatsApp' | 'SMS',
  options?: {
    timestamp?: Date;
    db?: any;
    skipQuietHours?: boolean;
  }
): Promise<ComplianceCheckResult> {
  const targetDate = options?.timestamp || new Date();
  const rules = await getComplianceRules();

  // Count recent interactions
  const callWindowMs = (rules.callCapDays || 7) * 24 * 60 * 60 * 1000;
  const callCutoff = new Date(targetDate.getTime() - callWindowMs).toISOString();
  const callRes = await db.select({ count: sql<number>`count(*)` }).from(calls)
    .where(and(eq(calls.leadId, lead.id), gte(calls.timestamp, callCutoff)));
  const recentCallCount = callRes[0]?.count || 0;

  const msgWindowMs = (rules.whatsAppCapDays || 30) * 24 * 60 * 60 * 1000;
  const msgCutoff = new Date(targetDate.getTime() - msgWindowMs).toISOString();
  const msgRes = await db.select({ count: sql<number>`count(*)` }).from(messages)
    .where(and(eq(messages.leadId, lead.id), eq(messages.direction, 'outbound'), gte(messages.timestamp, msgCutoff)));
  const recentMessageCount = msgRes[0]?.count || 0;

  const recentSmsCount = lead.contactAttempts7d?.sms || 0;

  return evaluateCompliance({
    lead,
    channel,
    policy: rules,
    recentCallCount: Math.max(recentCallCount, lead.contactAttempts7d?.calls || 0),
    recentMessageCount: Math.max(recentMessageCount, lead.contactAttempts7d?.whatsapp || 0),
    recentSmsCount,
    timestamp: targetDate,
  });
}

// Preserve original export names
export const validateLeadCommunicationCompliance = checkCompliance;
export const validateLeadCompliance = checkCompliance;

// Re-export for backward compatibility
export function getISTTime(date: Date = new Date()) {
  return getLocalTime(date, 'Asia/Kolkata');
}
