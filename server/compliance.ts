import { Lead, ContactFrequencyRules, DatabaseState } from '../src/types';
import { getComplianceRules, DEFAULT_FREQUENCY_RULES, getDb } from './db';

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
    currentTimeIST?: string;
    quietHoursWindow?: string;
  };
}

/**
 * Returns the current time in India Standard Time (Asia/Kolkata, UTC+5:30)
 */
export function getISTTime(date: Date = new Date()): { hours: number; minutes: number; timeString: string } {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
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
 * Checks whether the specified timestamp falls within configured quiet hours.
 */
export function isQuietHours(rules: ContactFrequencyRules, date: Date = new Date()): { isQuiet: boolean; currentIST: string; window: string } {
  if (!rules.quietHoursEnabled) {
    return { isQuiet: false, currentIST: '', window: '' };
  }

  const { hours, minutes, timeString } = getISTTime(date);
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
    currentIST: timeString,
    window: `${rules.quietHoursStart || '19:00'} - ${rules.quietHoursEnd || '09:00'} IST`
  };
}

/**
 * Single shared compliance verification engine.
 * Must be invoked by ALL outbound communication channels (/api/calls, /api/messages, etc.)
 * before recording any customer outreach.
 */
export function checkCompliance(
  lead: Lead,
  channel: 'Call' | 'WhatsApp' | 'SMS',
  options?: {
    timestamp?: Date;
    db?: DatabaseState;
    skipQuietHours?: boolean; // For explicit testing overrides if needed
  }
): ComplianceCheckResult {
  if (!lead) {
    return {
      allowed: false,
      statusCode: 404,
      code: 'LEAD_NOT_FOUND',
      reason: 'Lead not found for compliance verification.'
    };
  }

  const targetDate = options?.timestamp || new Date();
  const db = options?.db || getDb();
  const rules = db.complianceRules || getComplianceRules() || DEFAULT_FREQUENCY_RULES;

  // 1. Explicit Do-Not-Disturb / Global Opt-Out Check
  console.log('LEAD PREFS:', lead.preferences); const isOptedOut = Boolean(lead.preferences?.isOptedOut || (lead as any).isOptedOut);
  if (isOptedOut) {
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
        ruleViolated: 'LEAD_PREFERENCES_OPT_OUT'
      }
    };
  }

  // 2. Explicit Blocked Reason on Lead
  const blockedReason = lead.blockedReason || lead.preferences?.blockedReason;
  if (blockedReason && blockedReason.trim().length > 0) {
    return {
      allowed: false,
      statusCode: 403,
      code: 'LEAD_BLOCKED',
      reason: `Outreach blocked: ${blockedReason}`,
      details: {
        channel,
        leadId: lead.id,
        leadName: lead.name,
        ruleViolated: 'LEAD_BLOCKED_REASON'
      }
    };
  }

  // 3. 30-Day Temporary Pause / Snooze
  if (lead.preferences?.isPaused30Days) {
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
        code: 'CONTACT_PAUSED',
        reason: `Outreach blocked: Lead communications are temporarily snoozed/paused${pausedUntilMsg}.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'LEAD_PREFERENCES_PAUSED_30_DAYS'
        }
      };
    }
  }

  // 4. Preferred Channel Enforcement
  if (lead.preferences?.preferredChannel && lead.preferences.preferredChannel !== 'Any') {
    const preferred = lead.preferences.preferredChannel;
    if (preferred !== channel) {
      return {
        allowed: false,
        statusCode: 403,
        code: 'CHANNEL_RESTRICTED',
        reason: `Channel violation: Lead explicitly requested outreach via ${preferred} only. Attempted channel '${channel}' is restricted.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'LEAD_PREFERRED_CHANNEL_MISMATCH'
        }
      };
    }
  }

  // 5. Fatigue Status Hard-Cap (capped status)
  const isFatigueCapped = lead.fatigueStatus === 'capped' || (lead.preferences as any)?.fatigueStatus === 'capped';
  if (isFatigueCapped) {
    return {
      allowed: false,
      statusCode: 429,
      code: 'FATIGUE_CAP_EXCEEDED',
      reason: `Fatigue guardrail: Lead has reached maximum contact frequency cap (status: 'capped'). Further attempts risk severe spam flags or regulatory penalties.`,
      details: {
        channel,
        leadId: lead.id,
        leadName: lead.name,
        ruleViolated: 'FATIGUE_STATUS_CAPPED'
      }
    };
  }

  // 6. Rolling Window Frequency Caps per Channel
  const nowMs = targetDate.getTime();

  if (channel === 'Call') {
    const windowMs = (rules.callCapDays || 7) * 24 * 60 * 60 * 1000;
    const cutoff = nowMs - windowMs;
    // Count database calls within window
    const recentDbCalls = (db.calls || []).filter(c => c.leadId === lead.id && new Date(c.timestamp).getTime() >= cutoff).length;
    const recordedAttempts = lead.contactAttempts7d?.calls || 0;
    const totalAttempts = Math.max(recentDbCalls, recordedAttempts);

    if (totalAttempts >= rules.callCapMaxAttempts) {
      return {
        allowed: false,
        statusCode: 429,
        code: 'CALL_CAP_EXCEEDED',
        reason: `Contact frequency cap reached: Maximum ${rules.callCapMaxAttempts} voice calls per ${rules.callCapDays} rolling days exceeded (Current attempts: ${totalAttempts}).`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'CONTACT_FREQUENCY_CALL_CAP',
          attemptCount: totalAttempts,
          capLimit: rules.callCapMaxAttempts,
          timeWindowDays: rules.callCapDays
        }
      };
    }
  } else if (channel === 'WhatsApp') {
    const windowMs = (rules.whatsAppCapDays || 30) * 24 * 60 * 60 * 1000;
    const cutoff = nowMs - windowMs;
    const recentDbMessages = (db.messages || []).filter(
      m => m.leadId === lead.id && m.direction === 'outbound' && new Date(m.timestamp).getTime() >= cutoff
    ).length;
    const recordedAttempts = lead.contactAttempts7d?.whatsapp || 0;
    const totalAttempts = Math.max(recentDbMessages, recordedAttempts);

    if (totalAttempts >= rules.whatsAppCapMaxAttempts) {
      return {
        allowed: false,
        statusCode: 429,
        code: 'WHATSAPP_CAP_EXCEEDED',
        reason: `Contact frequency cap reached: Maximum ${rules.whatsAppCapMaxAttempts} WhatsApp messages per ${rules.whatsAppCapDays} rolling days exceeded (Current attempts: ${totalAttempts}).`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'CONTACT_FREQUENCY_WHATSAPP_CAP',
          attemptCount: totalAttempts,
          capLimit: rules.whatsAppCapMaxAttempts,
          timeWindowDays: rules.whatsAppCapDays
        }
      };
    }
  } else if (channel === 'SMS') {
    const windowMs = (rules.smsCapDays || 14) * 24 * 60 * 60 * 1000;
    const recordedAttempts = lead.contactAttempts7d?.sms || 0;
    if (recordedAttempts >= rules.smsCapMaxAttempts) {
      return {
        allowed: false,
        statusCode: 429,
        code: 'SMS_CAP_EXCEEDED',
        reason: `Contact frequency cap reached: Maximum ${rules.smsCapMaxAttempts} SMS messages per ${rules.smsCapDays} rolling days exceeded.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'CONTACT_FREQUENCY_SMS_CAP',
          attemptCount: recordedAttempts,
          capLimit: rules.smsCapMaxAttempts,
          timeWindowDays: rules.smsCapDays
        }
      };
    }
  }

  // 7. Quiet Hours Restrictions (TRAI / TCPA telecom regulation)
  if (!options?.skipQuietHours) {
    const quietCheck = isQuietHours(rules, targetDate);
    if (quietCheck.isQuiet) {
      return {
        allowed: false,
        statusCode: 403,
        code: 'QUIET_HOURS_RESTRICTION',
        reason: `Quiet hours active in India (${quietCheck.window}). Current IST: ${quietCheck.currentIST}. Commercial outreach during quiet hours is restricted by TRAI / TCPA regulations.`,
        details: {
          channel,
          leadId: lead.id,
          leadName: lead.name,
          ruleViolated: 'QUIET_HOURS_WINDOW',
          currentTimeIST: quietCheck.currentIST,
          quietHoursWindow: quietCheck.window
        }
      };
    }
  }

  return { allowed: true };
}

// Shared server-side function to validate lead communication compliance
export const validateLeadCommunicationCompliance = checkCompliance;
export const validateLeadCompliance = checkCompliance;
