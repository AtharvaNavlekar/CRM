import { pgTable, text, timestamp, boolean, jsonb, integer, real, index } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(), // Session ID
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id'), // Optional for platform staff
  tokenFamilyId: text('token_family_id').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  lastUsedAt: timestamp('last_used_at', { mode: 'string' }).notNull(),
  revokedAt: timestamp('revoked_at', { mode: 'string' }),
  revokeReason: text('revoke_reason'),
  createdIp: text('created_ip'),
  lastUsedIp: text('last_used_ip'),
  createdUserAgent: text('created_user_agent'),
  lastUsedUserAgent: text('last_used_user_agent')
}, (table) => {
  return {
    userIdIdx: index('idx_sessions_user_id').on(table.userId),
    tokenFamilyIdIdx: index('idx_sessions_token_family_id').on(table.tokenFamilyId),
    refreshTokenHashIdx: index('idx_sessions_refresh_token_hash').on(table.refreshTokenHash)
  };
});

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  status: text('status').notNull(), // 'active' | 'suspended' | 'trial' | 'provisioning'
  createdAt: timestamp('created_at', { mode: 'string' }).notNull(),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
  suspendedAt: timestamp('suspended_at', { mode: 'string' }),
  suspensionReason: text('suspension_reason'),
  tier: text('tier'), // 'starter' | 'growth' | 'enterprise'
  primaryContactName: text('primary_contact_name'),
  primaryContactEmail: text('primary_contact_email'),
  leadCap: integer('lead_cap'),
  userCap: integer('user_cap'),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'), // optional for global platform staff
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  isPlatformStaff: boolean('is_platform_staff').default(false),
  passwordHash: text('password_hash'),
  avatar: text('avatar'),
  title: text('title'),
  phone: text('phone'),
  teamId: text('team_id'),
  managesTeamIds: jsonb('manages_team_ids'), // array of strings
});

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  tenantId: text('tenant_id'),
});

export const leads = pgTable('leads', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  source: text('source').notNull(),
  stage: text('stage').notNull(),
  assignedRepId: text('assigned_rep_id').notNull(),
  assignedRepName: text('assigned_rep_name').notNull(),
  teamId: text('team_id'),
  createdDate: timestamp('created_date', { mode: 'string' }).notNull(),
  notes: text('notes').notNull(),
  industry: text('industry'),
  value: real('value'),
  callbackReminder: timestamp('callback_reminder', { mode: 'string' }),
  email: text('email'),
  fatigueStatus: text('fatigue_status'), // 'normal' | 'near_cap' | 'capped'
  contactAttempts7d: jsonb('contact_attempts_7d'),
  blockedReason: text('blocked_reason'),
  preferences: jsonb('preferences'),
  declaredCallReason: text('declared_call_reason'),
  assignedCampaign: text('assigned_campaign'),
  version: integer('version').default(1),
  updatedAt: timestamp('updated_at', { mode: 'string' }),
  customFields: jsonb('custom_fields'),
});

export const calls = pgTable('calls', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  leadId: text('lead_id').notNull(),
  leadName: text('lead_name').notNull(),
  leadPhone: text('lead_phone').notNull(),
  repId: text('rep_id').notNull(),
  repName: text('rep_name').notNull(),
  timestamp: timestamp('timestamp', { mode: 'string' }).notNull(),
  duration: integer('duration').notNull(),
  outcome: text('outcome').notNull(),
  notes: text('notes').notNull(),
  recordingSimulated: boolean('recording_simulated'),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  leadId: text('lead_id').notNull(),
  direction: text('direction').notNull(),
  text: text('text').notNull(),
  timestamp: timestamp('timestamp', { mode: 'string' }).notNull(),
  deliveryStatus: text('delivery_status').notNull(),
  retryCount: integer('retry_count'),
});

export const tickets = pgTable('tickets', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  subject: text('subject').notNull(),
  status: text('status').notNull(),
  createdDate: timestamp('created_date', { mode: 'string' }).notNull(),
  slaDueTime: timestamp('sla_due_time', { mode: 'string' }).notNull(),
  priority: text('priority').notNull(),
  leadId: text('lead_id'),
  leadName: text('lead_name'),
  assignedRepId: text('assigned_rep_id'),
});

export const ticketReplies = pgTable('ticket_replies', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull(),
  sender: text('sender').notNull(),
  senderRole: text('sender_role').notNull(),
  text: text('text').notNull(),
  timestamp: timestamp('timestamp', { mode: 'string' }).notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  timestamp: timestamp('timestamp', { mode: 'string' }).notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userRole: text('user_role').notNull(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  ip: text('ip').notNull(),
  scope: text('scope'),
  actionType: text('action_type'),
  requiredApproval: boolean('required_approval'),
});

export const impersonationSessions = pgTable('impersonation_sessions', {
  id: text('id').primaryKey(),
  platformUserId: text('platform_user_id').notNull(),
  platformUserName: text('platform_user_name').notNull(),
  platformUserRole: text('platform_user_role').notNull(),
  targetTenantId: text('target_tenant_id').notNull(),
  targetTenantName: text('target_tenant_name').notNull(),
  targetUserId: text('target_user_id').notNull(),
  targetUserName: text('target_user_name').notNull(),
  targetUserRole: text('target_user_role').notNull(),
  reason: text('reason').notNull(),
  startedAt: timestamp('started_at', { mode: 'string' }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  endedAt: timestamp('ended_at', { mode: 'string' }),
  active: boolean('active').notNull(),
  ip: text('ip').notNull(),
});

export const securityAlerts = pgTable('security_alerts', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp', { mode: 'string' }).notNull(),
  type: text('type'),
  title: text('title'),
  description: text('description'),
  severity: text('severity').notNull(),
  tenantId: text('tenant_id'),
  tenantName: text('tenant_name'),
  userId: text('user_id'),
  userName: text('user_name'),
  ip: text('ip'),
  sourceIp: text('source_ip'),
  details: text('details'),
  path: text('path'),
  resolved: boolean('resolved').default(false),
});

export const billingRecords = pgTable('billing_records', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  invoiceId: text('invoice_id').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency').notNull(),
  status: text('status').notNull(),
  dueDate: timestamp('due_date', { mode: 'string' }).notNull(),
  paidAt: timestamp('paid_at', { mode: 'string' }),
});

export const featureFlags = pgTable('feature_flags', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  enabledGlobally: boolean('enabled_globally').notNull(),
  enabledForTenantIds: jsonb('enabled_for_tenant_ids'), // string[]
  rolloutPercentage: integer('rollout_percentage'),
});

export const customFields = pgTable('custom_fields', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  options: jsonb('options'), // string[]
  required: boolean('required'),
});

export const rolePermissions = pgTable('role_permissions', {
  role: text('role').primaryKey(),
  scope: text('scope').notNull(),
  actions: jsonb('actions').notNull(), // string[]
  requiresApproval: jsonb('requires_approval'), // string[]
  canViewAllLeads: boolean('can_view_all_leads'),
  canExportData: boolean('can_export_data'),
  canManageTemplates: boolean('can_manage_templates'),
});

export const pipelineStages = pgTable('pipeline_stages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  order: integer('order').notNull(),
  color: text('color').notNull(),
  dotBg: text('dot_bg').notNull(),
});

export const complianceRules = pgTable('compliance_rules', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id'),
  callCapMaxAttempts: integer('call_cap_max_attempts').notNull(),
  callCapDays: integer('call_cap_days').notNull(),
  whatsAppCapMaxAttempts: integer('whats_app_cap_max_attempts').notNull(),
  whatsAppCapDays: integer('whats_app_cap_days').notNull(),
  smsCapMaxAttempts: integer('sms_cap_max_attempts').notNull(),
  smsCapDays: integer('sms_cap_days').notNull(),
  quietHoursEnabled: boolean('quiet_hours_enabled').notNull(),
  quietHoursStart: text('quiet_hours_start').notNull(),
  quietHoursEnd: text('quiet_hours_end').notNull(),
  enforceTimezone: text('enforce_timezone').notNull(),
});
