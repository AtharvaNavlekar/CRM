import { DatabaseState, ReportStats, User, ContactFrequencyRules, HourlyCallActivity, RepLeaderboardItem, Lead } from '../src/types';
import { auditRepository } from './repositories';
import { db } from './db/client';
import { leads, calls, messages, users} from './db/schema';
import { eq } from 'drizzle-orm';

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

export async function loadDatabase(): Promise<DatabaseState> { return {} as any; }

export async function getComplianceRules(): Promise<ContactFrequencyRules> {
  // Ideally fetch from tenantSettings or a default
  // For now return defaults as it was centralized in legacy
  return { ...DEFAULT_FREQUENCY_RULES };
}

export function sanitizeUser(user: User): User {
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function saveDatabase() {
  // Deprecated. Writes should go through repositories.
}

export async function getDb(): Promise<DatabaseState> { return {} as any; }

export async function createBackup(name: string, autoCreated = false, user?: any) {
  return { id: 'disabled', timestamp: new Date().toISOString(), name, recordsCount: { leads: 0, calls: 0, messages: 0, tickets: 0 }, fileSizeKb: 0, autoCreated };
}

export async function restoreBackup(backupId: string, user?: any): Promise<boolean> {
  return false;
}

export async function resetDatabase(user?: any) { return {} as any; }

// Compute real report metrics from database records scoped to tenant
export async function calculateReports(tenantId?: string): Promise<ReportStats> {
  const leadsData = tenantId ? await db.select().from(leads).where(eq(leads.tenantId, tenantId)) : await db.select().from(leads);
  const callsData = tenantId ? await db.select().from(calls).where(eq(calls.tenantId, tenantId)) : await db.select().from(calls);
  const usersData = tenantId ? await db.select().from(users).where(eq(users.tenantId, tenantId)) : await db.select().from(users);
  
  const leadsObj = leadsData as unknown as Lead[];
  const callsObj = callsData as any[];
  const usersObj = usersData as any[];

  const totalLeads = leadsObj.length;
  const leadsWon = leadsObj.filter((l: Lead) => l.stage === 'Won').length;
  const leadsLost = leadsObj.filter((l: Lead) => l.stage === 'Lost').length;
  const conversionRate = totalLeads > 0 ? Math.round((leadsWon / totalLeads) * 100) : 0;

  // Calls made today (in Indian local time or last 24h)
  const oneDayAgo = Date.now() - 24 * 3600 * 1000;
  const callsMadeToday = callsObj.filter((c: any) => new Date(c.timestamp).getTime() >= oneDayAgo).length;

  // Source breakdown
  const sourceMap: Record<string, number> = {};
  leadsObj.forEach((l: Lead) => {
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
    count: leadsObj.filter((l: Lead) => l.stage === st).length
  }));

  // Calls per rep
  const repList = usersObj.filter((u: User) => u.role === 'telecaller' || u.role === 'tl');
  const callsPerRep = repList.map((rep: User) => {
    const repCalls = callsObj.filter((c: any) => c.repId === rep.id || c.repName === rep.name);
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

    const dayLeads = leadsObj.filter((l: Lead) => {
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
  const allMessagesData = tenantId ? await db.select().from(messages).where(eq(messages.tenantId, tenantId)) : await db.select().from(messages);
  const allMessages = allMessagesData as any[];
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

  callsObj.forEach((c: any) => {
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
  leadsObj.forEach((l: Lead) => {
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
    const repCalls = callsObj.filter((c: any) => c.repId === rep.id || c.repName === rep.name);
    const repWon = leadsObj.filter((l: Lead) => l.assignedRepId === rep.id && l.stage === 'Won').length;
    const repTotalLeads = leadsObj.filter((l: Lead) => l.assignedRepId === rep.id).length;
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
