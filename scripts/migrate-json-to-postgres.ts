import * as fs from 'fs';
import * as path from 'path';
import { db } from '../server/db/client';
import * as schema from '../server/db/schema';
import { DatabaseState } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('No db.json found, skipping migration.');
    process.exit(0);
  }

  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const dbState = JSON.parse(raw) as DatabaseState;

  console.log('Starting migration to PostgreSQL...');

  try {
    await db.transaction(async (tx) => {
      // Clear existing records to avoid conflicts if re-running
      await tx.delete(schema.ticketReplies);
      await tx.delete(schema.tickets);
      await tx.delete(schema.messages);
      await tx.delete(schema.calls);
      await tx.delete(schema.leads);
      await tx.delete(schema.auditLogs);
      await tx.delete(schema.securityAlerts);
      await tx.delete(schema.impersonationSessions);
      await tx.delete(schema.billingRecords);
      await tx.delete(schema.users);
      await tx.delete(schema.tenants);
      await tx.delete(schema.featureFlags);
      await tx.delete(schema.customFields);
      await tx.delete(schema.rolePermissions);
      await tx.delete(schema.pipelineStages);
      await tx.delete(schema.complianceRules);

      // Insert tenants
      if (dbState.tenants && dbState.tenants.length > 0) {
        await tx.insert(schema.tenants).values(dbState.tenants as any);
        console.log(`Migrated ${dbState.tenants.length} tenants`);
      }

      // Insert users
      if (dbState.users && dbState.users.length > 0) {
        await tx.insert(schema.users).values(dbState.users as any);
        console.log(`Migrated ${dbState.users.length} users`);
      }

      // Insert leads
      if (dbState.leads && dbState.leads.length > 0) {
        await tx.insert(schema.leads).values(dbState.leads as any);
        console.log(`Migrated ${dbState.leads.length} leads`);
      }

      // Insert calls
      if (dbState.calls && dbState.calls.length > 0) {
        await tx.insert(schema.calls).values(dbState.calls as any);
        console.log(`Migrated ${dbState.calls.length} calls`);
      }

      // Insert messages
      if (dbState.messages && dbState.messages.length > 0) {
        await tx.insert(schema.messages).values(dbState.messages as any);
        console.log(`Migrated ${dbState.messages.length} messages`);
      }

      // Insert tickets & replies
      if (dbState.tickets && dbState.tickets.length > 0) {
        const repliesToInsert = [];
        const ticketsToInsert = [];
        
        for (const t of dbState.tickets) {
          const { replies, ...ticketData } = t;
          ticketsToInsert.push(ticketData);
          if (replies && replies.length > 0) {
            for (const r of replies) {
              repliesToInsert.push({ ...r, ticketId: t.id });
            }
          }
        }
        
        if (ticketsToInsert.length > 0) {
          await tx.insert(schema.tickets).values(ticketsToInsert as any);
        }
        if (repliesToInsert.length > 0) {
          await tx.insert(schema.ticketReplies).values(repliesToInsert as any);
        }
        console.log(`Migrated ${ticketsToInsert.length} tickets and ${repliesToInsert.length} replies`);
      }

      // Insert audit logs
      if (dbState.auditLogs && dbState.auditLogs.length > 0) {
        await tx.insert(schema.auditLogs).values(dbState.auditLogs as any);
        console.log(`Migrated ${dbState.auditLogs.length} audit logs`);
      }

      // Globals
      if (dbState.customFields && dbState.customFields.length > 0) {
        await tx.insert(schema.customFields).values(dbState.customFields as any);
      }
      if (dbState.rolePermissions && dbState.rolePermissions.length > 0) {
        await tx.insert(schema.rolePermissions).values(dbState.rolePermissions as any);
      }
      if (dbState.pipelineStages && dbState.pipelineStages.length > 0) {
        await tx.insert(schema.pipelineStages).values(dbState.pipelineStages as any);
      }
      if (dbState.complianceRules) {
        const compliancePayload = { ...dbState.complianceRules, id: 'global' };
        await tx.insert(schema.complianceRules).values(compliancePayload as any);
      }
      if (dbState.securityAlerts && dbState.securityAlerts.length > 0) {
        await tx.insert(schema.securityAlerts).values(dbState.securityAlerts as any);
      }
      if (dbState.featureFlags && dbState.featureFlags.length > 0) {
        await tx.insert(schema.featureFlags).values(dbState.featureFlags as any);
      }
      if (dbState.billingRecords && dbState.billingRecords.length > 0) {
        await tx.insert(schema.billingRecords).values(dbState.billingRecords as any);
      }
      
      console.log('Migration complete!');
    });
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  process.exit(0);
}

main();
