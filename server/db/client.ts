import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dev from '../seed/development';
import * as dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

function evaluateCondition(item: any, cond: any): boolean {
  if (!cond) return true;
  if (!cond.queryChunks) return true;

  const subSqls: any[] = [];
  let colName: string | null = null;
  let paramVal: any = undefined;

  for (const chunk of cond.queryChunks) {
    if (chunk && chunk.queryChunks) {
      subSqls.push(chunk);
    } else if (chunk && chunk.name && (chunk.columnType || chunk.dataType)) {
      colName = chunk.name;
    } else if (chunk && 'value' in chunk && (chunk.constructor?.name === 'Param' || chunk.brand === undefined)) {
      if (!Array.isArray(chunk.value)) {
        paramVal = chunk.value;
      }
    }
  }

  if (subSqls.length > 0) {
    const textChunks = cond.queryChunks
      .filter((c: any) => c && Array.isArray(c.value))
      .map((c: any) => c.value.join(''))
      .join(' ');
    if (/ or /i.test(textChunks)) {
      return subSqls.some((s: any) => evaluateCondition(item, s));
    } else {
      return subSqls.every((s: any) => evaluateCondition(item, s));
    }
  }

  if (colName) {
    const itemVal = item[colName];
    if (paramVal !== undefined) {
      if (typeof itemVal === 'boolean' || typeof paramVal === 'boolean') {
        return Boolean(itemVal) === Boolean(paramVal);
      }
      return String(itemVal).toLowerCase() === String(paramVal).toLowerCase();
    }
  }
  return true;
}

const DEFAULT_ROLE_PERMISSIONS = [
  {
    id: 'rp-owner',
    role: 'owner',
    scope: 'COMPANY',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT', 'DELETE', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES', 'PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE', 'all', 'leads:read', 'leads:write', 'leads:delete', 'leads:assign', 'leads:export', 'reports:read', 'settings:read', 'settings:write', 'users:read', 'users:write', 'audit:read'],
    permissions: ['all', 'leads:read', 'leads:write', 'leads:delete', 'leads:assign', 'leads:export', 'reports:read', 'settings:read', 'settings:write', 'users:read', 'users:write', 'audit:read'],
    requiresApproval: ['EXPORT'],
    canViewAllLeads: true,
    canExportData: true,
    canManageTemplates: true
  },
  {
    id: 'rp-cto',
    role: 'cto',
    scope: 'COMPANY',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT', 'DELETE', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES', 'PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE', 'all', 'leads:read', 'leads:write', 'leads:delete', 'leads:assign', 'leads:export', 'reports:read', 'settings:read', 'settings:write', 'users:read', 'users:write', 'audit:read'],
    permissions: ['all', 'leads:read', 'leads:write', 'leads:delete', 'leads:assign', 'leads:export', 'reports:read', 'settings:read', 'settings:write', 'users:read', 'users:write', 'audit:read'],
    requiresApproval: ['EXPORT'],
    canViewAllLeads: true,
    canExportData: true,
    canManageTemplates: true
  },
  {
    id: 'rp-it',
    role: 'it',
    scope: 'COMPANY',
    actions: ['VIEW', 'EDIT', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES', 'leads:read', 'leads:write', 'settings:read', 'settings:write', 'users:read', 'users:write', 'audit:read'],
    permissions: ['leads:read', 'leads:write', 'settings:read', 'settings:write', 'users:read', 'users:write', 'audit:read'],
    requiresApproval: [],
    canViewAllLeads: true,
    canExportData: false,
    canManageTemplates: true
  },
  {
    id: 'rp-tl-head',
    role: 'tl_head',
    scope: 'ALL_TEAMS',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT', 'leads:read', 'leads:write', 'leads:assign', 'reports:read', 'users:read', 'audit:read'],
    permissions: ['leads:read', 'leads:write', 'leads:assign', 'reports:read', 'users:read', 'audit:read'],
    requiresApproval: ['EXPORT'],
    canViewAllLeads: false,
    canExportData: true,
    canManageTemplates: false
  },
  {
    id: 'rp-tl',
    role: 'tl',
    scope: 'TEAM',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'leads:read', 'leads:write', 'leads:assign', 'reports:read', 'users:read'],
    permissions: ['leads:read', 'leads:write', 'leads:assign', 'reports:read', 'users:read'],
    requiresApproval: [],
    canViewAllLeads: false,
    canExportData: false,
    canManageTemplates: false
  },
  {
    id: 'rp-telecaller',
    role: 'telecaller',
    scope: 'SELF',
    actions: ['VIEW', 'EDIT', 'leads:read', 'leads:write'],
    permissions: ['leads:read', 'leads:write'],
    requiresApproval: [],
    canViewAllLeads: false,
    canExportData: false,
    canManageTemplates: false
  },
  {
    id: 'rp-admin',
    role: 'platform_admin',
    scope: 'PLATFORM',
    actions: ['all', 'PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE', 'VIEW', 'EDIT', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES', 'EXPORT', 'DELETE', 'REASSIGN'],
    permissions: ['all'],
    requiresApproval: [],
    canViewAllLeads: true,
    canExportData: true,
    canManageTemplates: true
  },
  {
    id: 'rp-support',
    role: 'platform_support',
    scope: 'PLATFORM',
    actions: ['all', 'PLATFORM_IMPERSONATE', 'VIEW'],
    permissions: ['all'],
    requiresApproval: [],
    canViewAllLeads: false,
    canExportData: false,
    canManageTemplates: false
  },
  {
    id: 'rp-sec',
    role: 'platform_security',
    scope: 'PLATFORM',
    actions: ['all', 'PLATFORM_ADMIN', 'VIEW'],
    permissions: ['all'],
    requiresApproval: [],
    canViewAllLeads: false,
    canExportData: false,
    canManageTemplates: false
  }
];

function createMockDb() {
  console.warn('[AI Studio] PostgreSQL not connected — using in-memory database mock');

  const tables: Record<string, any[]> = {
    users: [...dev.INITIAL_USERS],
    tenants: [...dev.INITIAL_TENANTS],
    teams: [...dev.TEAMS],
    leads: [...dev.INITIAL_LEADS],
    calls: [...dev.INITIAL_CALLS],
    messages: [...dev.INITIAL_MESSAGES],
    tickets: [...dev.INITIAL_TICKETS],
    ticket_replies: [],
    custom_fields: [],
    role_permissions: [...DEFAULT_ROLE_PERMISSIONS],
    pipeline_stages: [],
    compliance_rules: [],
    audit_logs: [...dev.INITIAL_AUDIT_LOGS],
    security_alerts: [...dev.INITIAL_SECURITY_ALERTS],
    billing_records: [...dev.INITIAL_BILLING_RECORDS],
    feature_flags: [...dev.INITIAL_FEATURE_FLAGS],
    sessions: [],
    impersonation_sessions: [],
    jobs: []
  };

  const getTableName = (t: any): string => {
    if (!t) return 'unknown';
    return t[Symbol.for('drizzle:Name')] || t._?.name || (typeof t === 'string' ? t : 'unknown');
  };

  const mockDb: any = {
    select: (_fields?: any) => ({
      from: (table: any) => {
        const tableName = getTableName(table);
        let filterCond: any = null;
        let limitCount: number | null = null;
        let offsetCount: number | null = null;

        const execute = () => {
          let rows = [...(tables[tableName] || [])];
          if (filterCond) {
            rows = rows.filter(item => evaluateCondition(item, filterCond));
          }
          if (offsetCount !== null) {
            rows = rows.slice(offsetCount);
          }
          if (limitCount !== null) {
            rows = rows.slice(0, limitCount);
          }
          return rows;
        };

        const builder = {
          where: (cond: any) => {
            filterCond = cond;
            return builder;
          },
          limit: (n: number) => {
            limitCount = n;
            return builder;
          },
          offset: (n: number) => {
            offsetCount = n;
            return builder;
          },
          orderBy: (..._args: any[]) => builder,
          then: (onfulfilled?: any, onrejected?: any) => Promise.resolve(execute()).then(onfulfilled, onrejected),
          catch: (onrejected?: any) => Promise.resolve(execute()).catch(onrejected)
        };
        return builder;
      }
    }),

    insert: (table: any) => ({
      values: (val: any) => {
        const tableName = getTableName(table);
        const items = Array.isArray(val) ? val : [val];
        const inserted = items.map(item => ({ id: item.id || crypto.randomUUID(), ...item }));
        tables[tableName] = [...(tables[tableName] || []), ...inserted];

        const builder = {
          returning: (_fields?: any) => builder,
          then: (onfulfilled?: any, onrejected?: any) => Promise.resolve(inserted).then(onfulfilled, onrejected),
          catch: (onrejected?: any) => Promise.resolve(inserted).catch(onrejected)
        };
        return builder;
      }
    }),

    update: (table: any) => ({
      set: (updates: any) => {
        const tableName = getTableName(table);
        let filterCond: any = null;

        const execute = () => {
          const updatedRows: any[] = [];
          tables[tableName] = (tables[tableName] || []).map(item => {
            if (evaluateCondition(item, filterCond)) {
              const updated = { ...item, ...updates };
              updatedRows.push(updated);
              return updated;
            }
            return item;
          });
          return updatedRows;
        };

        const builder = {
          where: (cond: any) => {
            filterCond = cond;
            return builder;
          },
          returning: (_fields?: any) => builder,
          then: (onfulfilled?: any, onrejected?: any) => Promise.resolve(execute()).then(onfulfilled, onrejected),
          catch: (onrejected?: any) => Promise.resolve(execute()).catch(onrejected)
        };
        return builder;
      }
    }),

    delete: (table: any) => ({
      where: (cond: any) => {
        const tableName = getTableName(table);
        const before = (tables[tableName] || []).length;
        tables[tableName] = (tables[tableName] || []).filter(item => !evaluateCondition(item, cond));
        const deletedCount = before - (tables[tableName] || []).length;

        const builder = {
          returning: () => builder,
          then: (onfulfilled?: any, onrejected?: any) => Promise.resolve({ rowCount: deletedCount }).then(onfulfilled, onrejected),
          catch: (onrejected?: any) => Promise.resolve({ rowCount: deletedCount }).catch(onrejected)
        };
        return builder;
      }
    }),

    transaction: async (cb: any) => {
      return await cb(mockDb);
    },

    query: new Proxy({}, {
      get: (_, prop: string) => ({
        findMany: async () => tables[prop] || [],
        findFirst: async () => (tables[prop] || [])[0] || null,
        findUnique: async () => (tables[prop] || [])[0] || null,
      })
    })
  };

  return mockDb;
}

let dbInstance: any;

if (process.env.DATABASE_URL) {
  try {
    const queryClient = postgres(process.env.DATABASE_URL, { prepare: false });
    dbInstance = drizzle(queryClient, { schema });
  } catch (err) {
    console.warn('[AI Studio] Failed to connect to PostgreSQL with DATABASE_URL, falling back to mock');
    dbInstance = createMockDb();
  }
} else {
  dbInstance = createMockDb();
}

export const db = dbInstance;
