import fs from 'fs';
import path from 'path';
import {
  DatabaseState,
  Lead,
  Call,
  Message,
  Ticket,
  User,
  AuditLog,
  BackupRecord,
  ReportStats,
  CustomField,
  RolePermission,
  PipelineStageConfig,
  HourlyCallActivity,
  RepLeaderboardItem,
  ContactFrequencyRules
} from '../src/types';
import { INITIAL_USERS, INITIAL_LEADS, INITIAL_CALLS, INITIAL_MESSAGES, INITIAL_TICKETS, INITIAL_AUDIT_LOGS, DEFAULT_PASSWORD_HASH } from './seedData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export const DEFAULT_PIPELINE_STAGES: PipelineStageConfig[] = [
  { id: 'New', title: 'New Leads', order: 1, color: 'text-sky-700 dark:text-sky-300', dotBg: 'bg-sky-500' },
  { id: 'Contacted', title: 'Contacted', order: 2, color: 'text-indigo-700 dark:text-indigo-300', dotBg: 'bg-indigo-500' },
  { id: 'Follow-up', title: 'Follow-up Due', order: 3, color: 'text-amber-700 dark:text-amber-300', dotBg: 'bg-amber-500' },
  { id: 'Negotiation', title: 'Negotiation', order: 4, color: 'text-purple-700 dark:text-purple-300', dotBg: 'bg-purple-500' },
  { id: 'Won', title: 'Won Closed', order: 5, color: 'text-emerald-700 dark:text-emerald-300', dotBg: 'bg-emerald-500' },
  { id: 'Lost', title: 'Lost / Dropped', order: 6, color: 'text-rose-700 dark:text-rose-300', dotBg: 'bg-rose-500' }
];

export const DEFAULT_CUSTOM_FIELDS: CustomField[] = [
  { id: 'cf-1', name: 'Estimated Budget / Ticket Size', type: 'select', options: ['< ₹25 Lakhs', '₹25L - ₹50L', '₹50L - ₹1 Crore', '> ₹1 Crore'], required: true },
  { id: 'cf-2', name: 'Purchase Timeline', type: 'select', options: ['Immediate (Within 7 days)', '15 - 30 Days', '1 - 3 Months', 'Exploring'], required: false },
  { id: 'cf-3', name: 'Preferred Location / Region', type: 'text', required: false },
  { id: 'cf-4', name: 'Decision Maker', type: 'select', options: ['Self', 'Partner / Spouse', 'Family Committee', 'Corporate Board'], required: false }
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'telecaller',
    scope: 'SELF',
    actions: ['VIEW', 'EDIT']
  },
  {
    role: 'tl',
    scope: 'TEAM',
    actions: ['VIEW', 'EDIT', 'REASSIGN']
  },
  {
    role: 'tl_head',
    scope: 'ALL_TEAMS',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT'],
    requiresApproval: ['EXPORT']
  },
  {
    role: 'it',
    scope: 'SYSTEM',
    actions: ['VIEW', 'MANAGE_USERS']
  },
  {
    role: 'owner',
    scope: 'COMPANY',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT', 'DELETE', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES'],
    requiresApproval: ['EDIT', 'DELETE']
  },
  {
    role: 'cto',
    scope: 'COMPANY',
    actions: ['VIEW', 'EDIT', 'EXPORT', 'DELETE', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES'],
    requiresApproval: ['EDIT', 'DELETE', 'MANAGE_COMPLIANCE_RULES']
  }
];

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
  enforceTimezone: 'Asia/Kolkata (IST)'
};

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

let dbState: DatabaseState;

export function loadDatabase(): DatabaseState {
  ensureDirectories();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      dbState = JSON.parse(raw);
      let stateChanged = false;
      if (!dbState.customFields || dbState.customFields.length === 0) {
        dbState.customFields = [...DEFAULT_CUSTOM_FIELDS];
      }
      
      // Migrate rolePermissions if using old 3-role shape or missing actions
      const hasOldRoles = !dbState.rolePermissions ||
        dbState.rolePermissions.length === 0 ||
        dbState.rolePermissions.some(p => (p as any).canViewAllLeads !== undefined && !p.actions) ||
        !dbState.rolePermissions.some(p => p.role === 'owner');

      if (hasOldRoles) {
        dbState.rolePermissions = [...DEFAULT_ROLE_PERMISSIONS];
        stateChanged = true;
      }

      if (!dbState.pipelineStages || dbState.pipelineStages.length === 0) {
        dbState.pipelineStages = [...DEFAULT_PIPELINE_STAGES];
      }
      if (dbState.autoAssignmentEnabled === undefined) {
        dbState.autoAssignmentEnabled = true;
      }
      if (!dbState.complianceRules) {
        dbState.complianceRules = { ...DEFAULT_FREQUENCY_RULES };
        stateChanged = true;
      }

      // Migrate existing users to the 6-role multi-tier model
      for (const u of dbState.users) {
        if (!u.passwordHash) {
          u.passwordHash = DEFAULT_PASSWORD_HASH;
          stateChanged = true;
        }

        // Migrate 'Admin' -> 'owner'
        if (u.role === ('Admin' as any)) {
          u.role = 'owner';
          u.title = u.title || 'Owner & Managing Director';
          stateChanged = true;
        } else if (u.role === ('Team Lead' as any)) {
          // Migrate 'Team Lead' -> 'tl'
          u.role = 'tl';
          if (!u.teamId) u.teamId = 'team-mumbai';
          stateChanged = true;
        } else if (u.role === ('Rep' as any)) {
          // Migrate 'Rep' -> 'telecaller'
          u.role = 'telecaller';
          if (!u.teamId) {
            u.teamId = (u.id === 'usr-4' || u.email === 'sneha@telecrm.in') ? 'team-delhi' : 'team-mumbai';
          }
          stateChanged = true;
        }
      }

      // Ensure new accounts for all 6 roles exist (cto, it, tl_head)
      const missingInitialUsers = INITIAL_USERS.filter(
        iu => !dbState.users.some(u => u.email.toLowerCase() === iu.email.toLowerCase())
      );
      if (missingInitialUsers.length > 0) {
        dbState.users.push(...missingInitialUsers);
        stateChanged = true;
      }

      // Ensure all leads have version, updatedAt, and teamId
      for (const l of dbState.leads) {
        if (!l.version) {
          l.version = 1;
          stateChanged = true;
        }
        if (!l.updatedAt) {
          l.updatedAt = l.createdDate || new Date().toISOString();
          stateChanged = true;
        }
        if (!l.teamId) {
          const rep = dbState.users.find(u => u.id === l.assignedRepId);
          l.teamId = rep?.teamId || 'team-mumbai';
          stateChanged = true;
        }
      }

      if (stateChanged) {
        saveDatabase();
      }
      return dbState;
    } catch (e) {
      console.error('Error reading db.json, re-initializing with seed data:', e);
    }
  }

  // Initialize fresh database
  dbState = {
    users: [...INITIAL_USERS],
    leads: INITIAL_LEADS.map(l => ({
      ...l,
      version: l.version || 1,
      updatedAt: l.updatedAt || l.createdDate || new Date().toISOString()
    })),
    calls: [...INITIAL_CALLS],
    messages: [...INITIAL_MESSAGES],
    tickets: [...INITIAL_TICKETS],
    auditLogs: [...INITIAL_AUDIT_LOGS],
    backups: [],
    customFields: [...DEFAULT_CUSTOM_FIELDS],
    rolePermissions: [...DEFAULT_ROLE_PERMISSIONS],
    pipelineStages: [...DEFAULT_PIPELINE_STAGES],
    autoAssignmentEnabled: true,
    complianceRules: { ...DEFAULT_FREQUENCY_RULES }
  };

  saveDatabase();

  // Create initial automated backup
  createBackup('Initial System Baseline', true, { name: 'System', role: 'owner', id: 'system' });
  return dbState;
}

export function getComplianceRules(): ContactFrequencyRules {
  if (!dbState) loadDatabase();
  return dbState.complianceRules || { ...DEFAULT_FREQUENCY_RULES };
}

export function updateComplianceRules(updates: Partial<ContactFrequencyRules>): ContactFrequencyRules {
  if (!dbState) loadDatabase();
  dbState.complianceRules = {
    ...(dbState.complianceRules || DEFAULT_FREQUENCY_RULES),
    ...updates
  };
  saveDatabase();
  return dbState.complianceRules;
}

export function sanitizeUser(user: User): User {
  const { passwordHash, ...safe } = user;
  return safe;
}

export function saveDatabase() {
  ensureDirectories();
  fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
}

export function getDb(): DatabaseState {
  if (!dbState) {
    return loadDatabase();
  }
  return dbState;
}

export function logAudit(
  action: string,
  details: string,
  user?: { id?: string; name?: string; role?: string },
  ip: string = '127.0.0.1',
  meta?: { scope?: any; actionType?: any; requiredApproval?: boolean }
) {
  const log: AuditLog = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
  dbState.auditLogs.unshift(log);
  if (dbState.auditLogs.length > 500) {
    dbState.auditLogs = dbState.auditLogs.slice(0, 500);
  }
  saveDatabase();
  return log;
}

export function createBackup(name: string, autoCreated = false, user?: { id?: string; name?: string; role?: string }): BackupRecord {
  ensureDirectories();
  const id = `backup-${Date.now()}`;
  const backupFileName = `${id}.json`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  const snapshot = {
    metadata: {
      id,
      timestamp: new Date().toISOString(),
      name,
      autoCreated,
      version: '2.0.0'
    },
    data: {
      users: dbState.users,
      leads: dbState.leads,
      calls: dbState.calls,
      messages: dbState.messages,
      tickets: dbState.tickets
    }
  };

  const content = JSON.stringify(snapshot, null, 2);
  fs.writeFileSync(backupFilePath, content, 'utf-8');
  const sizeKb = Math.round(Buffer.byteLength(content, 'utf-8') / 1024);

  const record: BackupRecord = {
    id,
    timestamp: new Date().toISOString(),
    name: name || `Backup ${new Date().toLocaleDateString('en-IN')}`,
    recordsCount: {
      leads: dbState.leads.length,
      calls: dbState.calls.length,
      messages: dbState.messages.length,
      tickets: dbState.tickets.length
    },
    fileSizeKb: Math.max(1, sizeKb),
    autoCreated
  };

  dbState.backups.unshift(record);
  saveDatabase();

  logAudit(
    autoCreated ? 'AUTO_BACKUP_CREATED' : 'MANUAL_BACKUP_CREATED',
    `Snapshot created: "${record.name}" with ${record.recordsCount.leads} leads.`,
    user
  );

  return record;
}

export function restoreBackup(backupId: string, user?: { id?: string; name?: string; role?: string }): boolean {
  ensureDirectories();
  const backupFilePath = path.join(BACKUPS_DIR, `${backupId}.json`);
  if (!fs.existsSync(backupFilePath)) {
    return false;
  }

  try {
    const raw = fs.readFileSync(backupFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data) {
      dbState.leads = parsed.data.leads || [];
      dbState.calls = parsed.data.calls || [];
      dbState.messages = parsed.data.messages || [];
      dbState.tickets = parsed.data.tickets || [];
      if (parsed.data.users && parsed.data.users.length > 0) {
        dbState.users = parsed.data.users;
      }
      saveDatabase();
      logAudit('BACKUP_RESTORED', `Restored database from snapshot ${backupId}.`, user);
      return true;
    }
  } catch (e) {
    console.error('Failed to restore backup:', e);
  }
  return false;
}

export function resetDatabase(user?: { id?: string; name?: string; role?: string }) {
  dbState = {
    users: [...INITIAL_USERS],
    leads: INITIAL_LEADS.map(l => ({
      ...l,
      version: l.version || 1,
      updatedAt: l.updatedAt || l.createdDate || new Date().toISOString()
    })),
    calls: [...INITIAL_CALLS],
    messages: [...INITIAL_MESSAGES],
    tickets: [...INITIAL_TICKETS],
    auditLogs: [...INITIAL_AUDIT_LOGS],
    backups: dbState?.backups || [],
    customFields: dbState?.customFields || [...DEFAULT_CUSTOM_FIELDS],
    rolePermissions: dbState?.rolePermissions || [...DEFAULT_ROLE_PERMISSIONS],
    pipelineStages: dbState?.pipelineStages || [...DEFAULT_PIPELINE_STAGES],
    autoAssignmentEnabled: dbState?.autoAssignmentEnabled ?? true
  };
  saveDatabase();
  logAudit('DATABASE_RESET', 'Restored default Indian SMB sample leads, calls, and tickets.', user);
  return dbState;
}

// Compute real report metrics from database records
export function calculateReports(): ReportStats {
  const leads = dbState.leads;
  const calls = dbState.calls;
  const users = dbState.users;

  const totalLeads = leads.length;
  const leadsWon = leads.filter(l => l.stage === 'Won').length;
  const leadsLost = leads.filter(l => l.stage === 'Lost').length;
  const conversionRate = totalLeads > 0 ? Math.round((leadsWon / totalLeads) * 100) : 0;

  // Calls made today (in Indian local time or last 24h)
  const oneDayAgo = Date.now() - 24 * 3600 * 1000;
  const callsMadeToday = calls.filter(c => new Date(c.timestamp).getTime() >= oneDayAgo).length;

  // Source breakdown
  const sourceMap: Record<string, number> = {};
  leads.forEach(l => {
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
    count: leads.filter(l => l.stage === st).length
  }));

  // Calls per rep
  const repList = users.filter(u => u.role === 'telecaller' || u.role === 'tl');
  const callsPerRep = repList.map(rep => {
    const repCalls = calls.filter(c => c.repId === rep.id || c.repName === rep.name);
    const converted = repCalls.filter(c => c.outcome === 'Converted').length;
    const totalSecs = repCalls.reduce((acc, curr) => acc + (curr.duration || 0), 0);
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

    const dayLeads = leads.filter(l => {
      const t = new Date(l.createdDate).getTime();
      return t >= dayStart && t < dayEnd;
    });

    const dayObj: { date: string; [stage: string]: number | string } = { date: dateStr };
    stages.forEach(st => {
      dayObj[st] = dayLeads.filter(l => l.stage === st).length;
    });
    dayObj['Total'] = dayLeads.length;
    days.push(dayObj);
  }

  // WhatsApp delivery rate computation
  const outboundMessages = dbState.messages.filter(m => m.direction === 'outbound');
  const deliveredCount = outboundMessages.filter(m => m.deliveryStatus === 'Delivered').length;
  const whatsappDeliveryRate = outboundMessages.length > 0
    ? Math.round((deliveredCount / outboundMessages.length) * 100)
    : 99;

  // Hour-by-hour call activity (0 to 23 hours, business hours peak 9 AM - 8 PM)
  const hourlyMap: Record<number, { calls: number; conversions: number; followUps: number; missedFollowUps: number }> = {};
  for (let h = 8; h <= 20; h++) {
    hourlyMap[h] = { calls: 0, conversions: 0, followUps: 0, missedFollowUps: 0 };
  }

  calls.forEach(c => {
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
  leads.forEach(l => {
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
  const repLeaderboard: RepLeaderboardItem[] = repList.map(rep => {
    const repCalls = calls.filter(c => c.repId === rep.id || c.repName === rep.name);
    const repWon = leads.filter(l => l.assignedRepId === rep.id && l.stage === 'Won').length;
    const repTotalLeads = leads.filter(l => l.assignedRepId === rep.id).length;
    const convRate = repTotalLeads > 0 ? Math.round((repWon / repTotalLeads) * 100) : 0;
    const totalSecs = repCalls.reduce((acc, c) => acc + (c.duration || 0), 0);
    return {
      repId: rep.id,
      repName: rep.name,
      calls: repCalls.length,
      conversions: repWon,
      talkTimeMin: Math.round(totalSecs / 60),
      conversionRate: convRate
    };
  }).sort((a, b) => b.calls - a.calls || b.conversions - a.conversions);

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

// Simulated automated backup scheduler (runs periodically or on demand)
setInterval(() => {
  if (dbState && dbState.leads.length > 0) {
    const lastBackup = dbState.backups[0];
    const hourAgo = Date.now() - 3600 * 1000;
    if (!lastBackup || new Date(lastBackup.timestamp).getTime() < hourAgo) {
      createBackup('Hourly Auto-Snapshot', true);
    }
  }
}, 1000 * 60 * 30); // check every 30 mins
