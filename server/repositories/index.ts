import { eq, and } from 'drizzle-orm';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { Lead, Call, Message, User, Ticket, Tenant, AuditLog, SecurityAlert, ImpersonationSession, BillingRecord, FeatureFlag, BackupRecord, CustomField, RolePermission, PipelineStageConfig, ContactFrequencyRules, TicketReply } from '../../src/types';

export const tenantRepository = {
  async findAll(): Promise<Tenant[]> {
    return (await db.select().from(schema.tenants)) as unknown as Tenant[];
  },
  async findById(id: string): Promise<Tenant | undefined> {
    const [record] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id));
    return record as unknown as Tenant | undefined;
  }
};

export const userRepository = {
  async findAll(): Promise<User[]> {
    return (await db.select().from(schema.users)) as unknown as User[];
  },
  async findById(id: string): Promise<User | undefined> {
    const [record] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return record as unknown as User | undefined;
  },
  async create(user: User): Promise<void> {
    await db.insert(schema.users).values(user as any);
  }
};

export const leadRepository = {
  async findAll(): Promise<Lead[]> {
    return (await db.select().from(schema.leads)) as unknown as Lead[];
  },
  async findById(id: string): Promise<Lead | undefined> {
    const [record] = await db.select().from(schema.leads).where(eq(schema.leads.id, id));
    return record as unknown as Lead | undefined;
  },
  async create(lead: Lead): Promise<void> {
    await db.insert(schema.leads).values(lead as any);
  },
  async update(id: string, updates: Partial<Lead>): Promise<void> {
    await db.update(schema.leads).set(updates as any).where(eq(schema.leads.id, id));
  },
  async delete(id: string): Promise<void> {
    await db.delete(schema.leads).where(eq(schema.leads.id, id));
  }
};

export const callRepository = {
  async findAll(): Promise<Call[]> {
    return (await db.select().from(schema.calls)) as unknown as Call[];
  },
  async create(call: Call): Promise<void> {
    await db.insert(schema.calls).values(call as any);
  }
};

export const messageRepository = {
  async findAll(): Promise<Message[]> {
    return (await db.select().from(schema.messages)) as unknown as Message[];
  },
  async create(message: Message): Promise<void> {
    await db.insert(schema.messages).values(message as any);
  }
};

export const ticketRepository = {
  async findAll(): Promise<Ticket[]> {
    const ticketsData = await db.select().from(schema.tickets);
    // Note: Ticket replies will need to be fetched separately if needed in legacy methods.
    // For now we will return just tickets with empty replies if they aren't loaded.
    return ticketsData.map(t => ({ ...t, replies: [] })) as unknown as Ticket[];
  },
  async create(ticket: Ticket): Promise<void> {
    const { replies, ...ticketData } = ticket;
    await db.insert(schema.tickets).values(ticketData as any);
  }
};

export const auditRepository = {
  async findAll(): Promise<AuditLog[]> {
    return (await db.select().from(schema.auditLogs)) as unknown as AuditLog[];
  },
  async create(log: AuditLog): Promise<void> {
    await db.insert(schema.auditLogs).values(log as any);
  }
};

// Legacy Data Fetcher for Reports and Middleware
export async function getLegacyState(): Promise<any> {
  const tenants = await tenantRepository.findAll();
  const users = await userRepository.findAll();
  const leads = await leadRepository.findAll();
  const calls = await callRepository.findAll();
  const messages = await messageRepository.findAll();
  const tickets = await ticketRepository.findAll();
  const auditLogs = await auditRepository.findAll();
  
  // Static/Config fallback defaults since they are small/global
  const customFields = await db.select().from(schema.customFields);
  const rolePermissions = await db.select().from(schema.rolePermissions);
  const pipelineStages = await db.select().from(schema.pipelineStages);
  const complianceRules = await db.select().from(schema.complianceRules);
  const securityAlerts = await db.select().from(schema.securityAlerts);
  const featureFlags = await db.select().from(schema.featureFlags);
  const billingRecords = await db.select().from(schema.billingRecords);
  
  return {
    tenants,
    users,
    leads,
    calls,
    messages,
    tickets,
    auditLogs,
    customFields,
    rolePermissions,
    pipelineStages,
    complianceRules: complianceRules[0] || {},
    securityAlerts,
    featureFlags,
    billingRecords,
    backups: []
  };
}
