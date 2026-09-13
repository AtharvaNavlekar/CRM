import { DatabaseState, ReportStats, User, ContactFrequencyRules, HourlyCallActivity, RepLeaderboardItem, Lead } from '../src/types';
import { getLegacyState, auditRepository } from './repositories';
export { getLegacyState } from './repositories';

export const DEFAULT_FREQUENCY_RULES: ContactFrequencyRules = {
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

export async function loadDatabase(): Promise<DatabaseState> {
  return await getLegacyState();
}

export async function getComplianceRules(): Promise<ContactFrequencyRules> {
  const dbState = await getLegacyState();
  return dbState.complianceRules || { ...DEFAULT_FREQUENCY_RULES };
}

export function sanitizeUser(user: User): User {
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function saveDatabase() {
  // Deprecated. Writes should go through repositories.
}

export async function getDb(): Promise<DatabaseState> {
  return await getLegacyState();
}

export async function logAudit(
  action: string,
  details: string,
  user?: { id?: string; name?: string; role?: string; tenantId?: string },
  ip: string = '127.0.0.1',
  meta?: { scope?: any; actionType?: any; requiredApproval?: boolean; tenantId?: string }
) {
  const targetTenantId = meta?.tenantId || user?.tenantId || (user?.role?.startsWith('platform_') ? undefined : 'tenant-apex');
  const log = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tenantId: targetTenantId,
    timestamp: new Date().toISOString(),
    userId: user?.id || 'system',
    userName: user?.name || 'System Auto',
    userRole: user?.role || 'owner',
    action,
    details,
    ip,
    ...(meta?.scope ? { scope: meta.scope } : {}),
    ...(meta?.actionType ? { actionType: meta.actionType } : {}),
    ...(meta?.requiredApproval !== undefined ? { requiredApproval: meta.requiredApproval } : {})
  };
  await auditRepository.create(log as any);
  return log;
}

export async function createBackup(name: string, autoCreated = false, user?: any) {
  return { id: 'disabled', timestamp: new Date().toISOString(), name, recordsCount: { leads: 0, calls: 0, messages: 0, tickets: 0 }, fileSizeKb: 0, autoCreated };
}

export async function restoreBackup(backupId: string, user?: any): Promise<boolean> {
  return false;
}

export async function resetDatabase(user?: any) {
  return await getLegacyState();
}

// Compute real report metrics from database records scoped to tenant
export async function calculateReports(tenantId?: string): Promise<ReportStats> {
  const dbState = await getLegacyState();
  const leads = tenantId ? dbState.leads.filter((l: Lead) => l.tenantId === tenantId) : dbState.leads;
  const calls = tenantId ? dbState.calls.filter((c: any) => c.tenantId === tenantId) : dbState.calls;
  const users = tenantId ? dbState.users.filter((u: any) => u.tenantId === tenantId) : dbState.users;

  const totalLeads = leads.length;
  const leadsWon = leads.filter((l: Lead) => l.stage === 'Won').length;
  const leadsLost = leads.filter((l: Lead) => l.stage === 'Lost').length;
  const conversionRate = totalLeads > 0 ? Math.round((leadsWon / totalLeads) * 100) : 0;

  // Calls made today (in Indian local time or last 24h)
  const oneDayAgo = Date.now() - 24 * 3600 * 1000;
  const callsMadeToday = calls.filter((c: any) => new Date(c.timestamp).getTime() >= oneDayAgo).length;

  // Source breakdown
  const sourceMap: Record<string, number> = {};
  leads.forEach((l: Lead) => {
    sourceMap[l.source] = (sourceMap[l.source] || 0) + 1;
  });
  const leadsBySource = Object.entries(sourceMap).map(([source, count]) => ({
    source,
    count,
    percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // Stage breakdown
  const stages: Array<Lead['stage']> = ['New', 'Contacted', 'Follow-up', 'Negotiation', 'Won', 'Lost'];
  const leadsByStage = stages.map(st => ({
    stage: st,
    count: leads.filter((l: Lead) => l.stage === st).length
  }));

  // Calls per rep
  const repList = users.filter((u: User) => u.role === 'telecaller' || u.role === 'tl');
  const callsPerRep = repList.map((rep: User) => {
    const repCalls = calls.filter((c: any) => c.repId === rep.id || c.repName === rep.name);
    const converted = repCalls.filter((c: any) => c.outcome === 'Converted').length;
    const totalSecs = repCalls.reduce((acc: number, curr: any) => acc + (curr.duration || 0), 0);
    return {
      repName: rep.name,
      totalCalls: repCalls.length,
      convertedCalls: converted,
      totalDurationMin: Math.round(totalSecs / 60)
    };
  });

  // Leads over time (past 7 days)
  const days: { date: string; [stage: string]: number | string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000);
    const dateStr = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 3600 * 1000;

    const dayLeads = leads.filter((l: Lead) => {
      const t = new Date(l.createdDate).getTime();
      return t >= dayStart && t < dayEnd;
    });

    const dayObj: { date: string; [stage: string]: number | string } = { date: dateStr };
    stages.forEach(st => {
      dayObj[st] = dayLeads.filter((l: Lead) => l.stage === st).length;
    });
    dayObj['Total'] = dayLeads.length;
    days.push(dayObj);
  }

  // WhatsApp delivery rate computation
  const allMessages = tenantId ? dbState.messages.filter((m: any) => m.tenantId === tenantId) : dbState.messages;
  const outboundMessages = allMessages.filter((m: any) => m.direction === 'outbound');
  const deliveredCount = outboundMessages.filter((m: any) => m.deliveryStatus === 'Delivered').length;
  const whatsappDeliveryRate = outboundMessages.length > 0
    ? Math.round((deliveredCount / outboundMessages.length) * 100)
    : 99;

  // Hour-by-hour call activity (0 to 23 hours, business hours peak 9 AM - 8 PM)
  const hourlyMap: Record<number, { calls: number; conversions: number; followUps: number; missedFollowUps: number }> = {};
  for (let h = 8; h <= 20; h++) {
    hourlyMap[h] = { calls: 0, conversions: 0, followUps: 0, missedFollowUps: 0 };
  }

  calls.forEach((c: any) => {
    const d = new Date(c.timestamp);
    const hour = d.getHours();
    if (hourlyMap[hour]) {
      hourlyMap[hour].calls += 1;
      if (c.outcome === 'Converted') hourlyMap[hour].conversions += 1;
      if (c.outcome === 'Follow-up') hourlyMap[hour].followUps += 1;
    }
  });

  // Calculate missed followups per hour
  const now = Date.now();
  leads.forEach((l: Lead) => {
    if (l.callbackReminder) {
      const cbTime = new Date(l.callbackReminder).getTime();
      if (cbTime < now && l.stage !== 'Won' && l.stage !== 'Lost') {
        const hour = new Date(cbTime).getHours();
        if (hourlyMap[hour]) {
          hourlyMap[hour].missedFollowUps += 1;
        }
      }
    }
  });

  const hourlyCallActivity: HourlyCallActivity[] = Object.entries(hourlyMap).map(([hStr, data]) => {
    const h = parseInt(hStr, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return {
      hour: h,
      hourLabel: `${displayH} ${period}`,
      calls: data.calls,
      conversions: data.conversions,
      followUps: data.followUps,
      missedFollowUps: data.missedFollowUps
    };
  });

  // Real-time rep leaderboard
  const repLeaderboard: RepLeaderboardItem[] = repList.map((rep: User) => {
    const repCalls = calls.filter((c: any) => c.repId === rep.id || c.repName === rep.name);
    const repWon = leads.filter((l: Lead) => l.assignedRepId === rep.id && l.stage === 'Won').length;
    const repTotalLeads = leads.filter((l: Lead) => l.assignedRepId === rep.id).length;
    const convRate = repTotalLeads > 0 ? Math.round((repWon / repTotalLeads) * 100) : 0;
    const totalSecs = repCalls.reduce((acc: number, c: any) => acc + (c.duration || 0), 0);
    return {
      repId: rep.id,
      repName: rep.name,
      calls: repCalls.length,
      conversions: repWon,
      talkTimeMin: Math.round(totalSecs / 60),
      conversionRate: convRate
    };
  }).sort((a: any, b: any) => b.calls - a.calls || b.conversions - a.conversions);

  return {
    totalLeads,
    callsMadeToday,
    conversionRate,
    leadsWon,
    leadsLost,
    whatsappDeliveryRate,
    leadsBySource,
    leadsByStage,
    callsPerRep,
    leadsOverTime: days,
    hourlyCallActivity,
    repLeaderboard
  };
}
