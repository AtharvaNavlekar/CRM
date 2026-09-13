export type ViewScope = 'SELF' | 'TEAM' | 'ALL_TEAMS' | 'SYSTEM' | 'COMPANY' | 'PLATFORM';

export type Action =
  | 'VIEW'
  | 'EDIT'
  | 'REASSIGN'
  | 'EXPORT'
  | 'DELETE'
  | 'MANAGE_USERS'
  | 'MANAGE_POLICY'
  | 'MANAGE_COMPLIANCE_RULES'
  | 'PLATFORM_ADMIN'
  | 'PLATFORM_IMPERSONATE'
  // Domain actions
  | 'users:create'
  | 'users:impersonate_tenant'
  | 'leads:read'
  | 'leads:create'
  | 'leads:update'
  | 'leads:reassign'
  | 'leads:export'
  | 'leads:delete'
  | 'leads:import'
  | 'calls:read'
  | 'calls:create'
  | 'messages:create'
  | 'compliance:update'
  | 'platform:manage';

export type UserRole =
  | 'telecaller'
  | 'tl'
  | 'tl_head'
  | 'it'
  | 'owner'
  | 'cto'
  | 'platform_admin'
  | 'platform_support'
  | 'platform_security';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'trial' | 'provisioning';
  createdAt: string;
  updatedAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  tier?: 'starter' | 'growth' | 'enterprise';
  primaryContactName?: string;
  primaryContactEmail?: string;
  leadCap?: number;
  userCap?: number;
}

export interface ImpersonationSession {
  id: string;
  platformUserId: string;
  platformUserName: string;
  platformUserRole: string;
  targetTenantId: string;
  targetTenantName: string;
  targetUserId: string;
  targetUserName: string;
  targetUserRole: string;
  reason: string;
  startedAt: string;
  endedAt?: string;
  active: boolean;
  ip: string;
}

export interface SecurityContext {
  actorUserId: string;
  actorRole: UserRole | string;
  actorTenantId?: string;
  actorTeamId?: string;
  actorManagesTeamIds?: string[];
  isPlatformStaff: boolean;

  tenantId?: string;

  impersonating: boolean;
  impersonationSessionId?: string;
  actingAsUserId?: string;

  requestId: string;
  ipAddress: string;
  userAgent?: string;
}

export interface SecurityAlert {
  id: string;
  timestamp: string;
  type?: 'CROSS_TENANT_ACCESS_ATTEMPT' | 'UNAUTHORIZED_SCOPE' | 'RATE_LIMIT_EXCEEDED' | 'SUSPICIOUS_LOGIN' | 'CRAWLER_BOT_BLOCKED';
  title?: string;
  description?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tenantId?: string;
  tenantName?: string;
  userId?: string;
  userName?: string;
  ip?: string;
  sourceIp?: string;
  details?: string;
  path?: string;
  resolved?: boolean;
}

export interface Team {
  id: string;
  name: string;
  location: string;
  tenantId?: string;
}

export interface User {
  id: string;
  tenantId?: string;           // Scoped to tenant (empty/undefined for global platform staff)
  name: string;
  email: string;
  role: UserRole;
  isPlatformStaff?: boolean;   // True for platform staff accounts
  impersonationSession?: ImpersonationSession | null; // For platform staff
  passwordHash?: string;
  avatar?: string;
  title?: string;
  phone?: string;
  teamId?: string;             // required for 'telecaller' and 'tl' roles
  managesTeamIds?: string[];   // required for 'tl_head' role — every team they oversee
}

export type LeadSource = 'Website' | 'WhatsApp' | 'Facebook' | 'Google Ads' | 'IndiaMART' | 'Manual';

export type LeadStage = 'New' | 'Contacted' | 'Follow-up' | 'Negotiation' | 'Won' | 'Lost';

export type PreferredChannel = 'Call' | 'WhatsApp' | 'SMS' | 'Email' | 'Any';
export type PreferredTimeWindow = 'Morning (10 AM - 1 PM)' | 'Afternoon (2 PM - 5 PM)' | 'Evening (5 PM - 7 PM)' | 'Anytime';
export type FatigueStatus = 'normal' | 'near_cap' | 'capped';

export interface LeadPreferences {
  preferredChannel: PreferredChannel;
  preferredTimeWindow: PreferredTimeWindow;
  allowedTopics: string[];
  isPaused30Days: boolean;
  pausedUntil?: string | null;
  isOptedOut: boolean;
  optOutReason?: string;
  blockedReason?: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  tenantId?: string; // Multi-tenant isolation scope
  name: string;
  phone: string;
  source: LeadSource;
  stage: LeadStage;
  assignedRepId: string;
  assignedRepName: string;
  teamId?: string; // Multi-Tier RBAC: derived from assignedRepId's owning rep's team
  createdDate: string; // ISO string
  notes: string;
  industry?: string;
  value?: number; // Estimated value in INR
  callbackReminder?: string | null; // ISO string
  email?: string;
  fatigueStatus?: FatigueStatus;
  contactAttempts7d?: {
    calls: number;
    whatsapp: number;
    sms: number;
  };
  blockedReason?: string;
  preferences?: LeadPreferences;
  declaredCallReason?: string;
  assignedCampaign?: string;
  version?: number;
  updatedAt?: string;
  customFields?: Record<string, any>;
}

export type CallOutcome = 'Interested' | 'Follow-up' | 'Not interested' | 'Converted';

export interface Call {
  id: string;
  tenantId?: string; // Multi-tenant isolation scope
  leadId: string;
  leadName: string;
  leadPhone: string;
  repId: string;
  repName: string;
  timestamp: string; // ISO string
  duration: number; // in seconds
  outcome: CallOutcome;
  notes: string;
  recordingSimulated?: boolean;
}

export type MessageDirection = 'inbound' | 'outbound';
export type DeliveryStatus = 'Queued' | 'Sent' | 'Delivered' | 'Failed-Retrying' | 'Failed';

export interface Message {
  id: string;
  tenantId?: string; // Multi-tenant isolation scope
  leadId: string;
  direction: MessageDirection;
  text: string;
  timestamp: string; // ISO string
  deliveryStatus: DeliveryStatus;
  retryCount?: number;
}

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved';
export type TicketPriority = 'Low' | 'Medium' | 'High';

export interface TicketReply {
  id: string;
  sender: string;
  senderRole: string;
  text: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  tenantId?: string; // Multi-tenant isolation scope
  subject: string;
  status: TicketStatus;
  createdDate: string; // ISO string
  slaDueTime: string; // ISO string (createdDate + 4 hours)
  priority: TicketPriority;
  leadId?: string;
  leadName?: string;
  assignedRepId?: string;
  replies: TicketReply[];
}

export interface AuditLog {
  id: string;
  tenantId?: string; // Multi-tenant isolation scope ('platform' for platform-level actions)
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  ip: string;
  scope?: ViewScope;
  actionType?: Action;
  requiredApproval?: boolean;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  name: string;
  recordsCount: {
    leads: number;
    calls: number;
    messages: number;
    tickets: number;
  };
  fileSizeKb: number;
  autoCreated: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
  required?: boolean;
}

export interface RolePermission {
  role: string; // 'telecaller' | 'tl' | 'tl_head' | 'it' | 'owner' | 'cto'
  scope: ViewScope;
  actions: Action[];
  requiresApproval?: Action[]; // actions that are permitted but must be logged/re-confirmed, not one-click
  canViewAllLeads?: boolean;
  canExportData?: boolean;
  canManageTemplates?: boolean;
}

export interface PipelineStageConfig {
  id: LeadStage;
  title: string;
  order: number;
  color: string;
  dotBg: string;
}

export interface DatabaseState {
  tenants?: Tenant[];
  users: User[];
  leads: Lead[];
  calls: Call[];
  messages: Message[];
  tickets: Ticket[];
  auditLogs: AuditLog[];
  backups: BackupRecord[];
  customFields?: CustomField[];
  rolePermissions?: RolePermission[];
  pipelineStages?: PipelineStageConfig[];
  autoAssignmentEnabled?: boolean;
  complianceRules?: ContactFrequencyRules;
  impersonationSessions?: ImpersonationSession[];
  securityAlerts?: SecurityAlert[];
  billingRecords?: BillingRecord[];
  featureFlags?: FeatureFlag[];
}

export interface BillingRecord {
  id: string;
  tenantId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  dueDate: string;
  paidAt?: string;
}

export interface FeatureFlag {
  id: string;
  key: string;               // e.g., 'new_reporting_widget'
  name: string;
  description: string;
  enabledGlobally: boolean;
  enabledForTenantIds: string[]; // explicit per-tenant overrides
  rolloutPercentage?: number;    // optional gradual rollout, 0-100
}

export interface HourlyCallActivity {
  hour: number;
  hourLabel: string;
  calls: number;
  conversions: number;
  followUps: number;
  missedFollowUps: number;
}

export interface RepLeaderboardItem {
  repId: string;
  repName: string;
  calls: number;
  conversions: number;
  talkTimeMin: number;
  conversionRate: number;
}

export interface ReportStats {
  totalLeads: number;
  callsMadeToday: number;
  conversionRate: number;
  leadsWon: number;
  leadsLost: number;
  whatsappDeliveryRate: number;
  leadsBySource: { source: string; count: number; percentage: number }[];
  leadsByStage: { stage: string; count: number }[];
  callsPerRep: { repName: string; totalCalls: number; convertedCalls: number; totalDurationMin: number }[];
  leadsOverTime: { date: string; [stage: string]: number | string }[];
  hourlyCallActivity: HourlyCallActivity[];
  repLeaderboard: RepLeaderboardItem[];
}

// ==========================================
// TRUST & COMPLIANCE MODULE TYPES
// ==========================================

export type VerificationStatus = 'Verified' | 'Pending' | 'Action Required';

export interface CallingNumberVerification {
  id: string;
  number: string;
  label: string;
  status: VerificationStatus;
  attestationLevel: 'A (Full Attestation)' | 'B (Partial)' | 'C (Gateway)';
  carrier: string;
  cnamRegisteredName: string;
  lastAuditDate: string;
  verifiedAnswerRate: number; // e.g. 62%
  unverifiedAnswerRate: number; // e.g. 20%
}

export interface CallerIdentityConfig {
  legalBusinessName: string;
  displayName: string;
  registrationNumber: string;
  logoUrl: string;
  businessWebsite: string;
  registeredAddress: string;
  callingNumbers: CallingNumberVerification[];
}

export interface CallReasonTag {
  id: string;
  name: string;
  category: 'General Inquiry' | 'Payment & Billing' | 'Loan Follow-up' | 'Debt Resolution & Recovery' | 'Product Demo' | 'Customer Care';
  attachedStage: string;
  campaign: string;
  isHighScrutiny: boolean;
  requiredForDialing: boolean;
  description: string;
  activeCallsCount: number;
}

export interface ContactFrequencyRules {
  tenantId?: string;
  callCapMaxAttempts: number;
  callCapDays: number;
  whatsAppCapMaxAttempts: number;
  whatsAppCapDays: number;
  smsCapMaxAttempts: number;
  smsCapDays: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // '19:00'
  quietHoursEnd: string; // '09:00'
  enforceTimezone: string;
}

export interface ChannelRoutingRule {
  id: string;
  tenantId?: string;
  pipelineStageOrCampaign: string;
  primaryChannel: 'WhatsApp' | 'Call' | 'SMS';
  waitPeriodHours: number;
  fallbackChannel: 'Call' | 'WhatsApp' | 'SMS' | 'None';
  triggerCondition: 'No response' | 'Unanswered call' | 'Delivered but unread';
  active: boolean;
  notes: string;
}

export interface ComplianceWatchCategory {
  id: string;
  tenantId?: string;
  categoryName: string;
  volumeCount: number;
  volumeChangePercent: number; // e.g. +85%
  isHighScrutiny: boolean;
  complaintRiskScore: 'Low' | 'Medium' | 'High' | 'Critical';
  trendPoints: number[]; // Sparkline data points
  lastAuditDate: string;
  flaggedReasons: string[];
}

