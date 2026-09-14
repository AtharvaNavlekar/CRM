import bcryptjs from 'bcryptjs';
import { db } from './server/db/client';
import { users, tenants, rolePermissions } from './server/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  const passwordHash = bcryptjs.hashSync('password123', 10);
  
  // Create a tenant
  await db.insert(tenants).values({
    id: 'tenant-test',
    name: 'Test Tenant',
    slug: 'test-tenant',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }).onConflictDoNothing();

  // Insert Role Permissions
  await db.insert(rolePermissions).values([
    {
      role: 'owner',
      scope: 'COMPANY',
      actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT', 'DELETE', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES'],
      requiresApproval: [],
      canViewAllLeads: true,
      canExportData: true,
      canManageTemplates: true
    },
    {
      role: 'tl',
      scope: 'TEAM',
      actions: ['VIEW', 'EDIT', 'REASSIGN', 'MANAGE_USERS'],
      requiresApproval: [],
      canViewAllLeads: false,
      canExportData: false,
      canManageTemplates: false
    },
    {
      role: 'telecaller',
      scope: 'SELF',
      actions: ['VIEW', 'EDIT'],
      requiresApproval: ['EXPORT', 'DELETE'],
      canViewAllLeads: false,
      canExportData: false,
      canManageTemplates: false
    }
  ]).onConflictDoNothing();

  // Insert Admin
  await db.insert(users).values({
    id: 'usr-1',
    name: 'Rahul Sharma',
    email: 'rahul@telecrm.in',
    passwordHash,
    role: 'Admin',
    tenantId: 'tenant-test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }).onConflictDoNothing();

  // Insert Rep
  await db.insert(users).values({
    id: 'usr-3',
    name: 'Amit Verma',
    email: 'amit@telecrm.in',
    passwordHash,
    role: 'Rep',
    tenantId: 'tenant-test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }).onConflictDoNothing();

  console.log('Test users and permissions seeded.');
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
