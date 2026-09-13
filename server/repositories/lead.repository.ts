import { eq, and } from 'drizzle-orm';
import { db } from '../db/client';
import { leads } from '../db/schema';
import { Lead } from '../../src/types';

export const leadRepository = {
  async findById(id: string): Promise<Lead | undefined> {
    const [record] = await db.select().from(leads).where(eq(leads.id, id));
    return record as unknown as Lead | undefined;
  },

  async findAllByTenant(tenantId: string): Promise<Lead[]> {
    const records = await db.select().from(leads).where(eq(leads.tenantId, tenantId));
    return records as unknown as Lead[];
  },

  async create(lead: Lead): Promise<void> {
    await db.insert(leads).values(lead as any);
  },

  async update(id: string, updates: Partial<Lead>): Promise<void> {
    await db.update(leads).set(updates as any).where(eq(leads.id, id));
  },

  async delete(id: string): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }
};
