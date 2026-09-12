export type ViewScope = 'SELF' | 'TEAM' | 'ALL_TEAMS' | 'SYSTEM' | 'COMPANY';

export type Action =
  | 'VIEW'
  | 'EDIT'
  | 'REASSIGN'
  | 'EXPORT'
  | 'DELETE'
  | 'MANAGE_USERS'
  | 'MANAGE_POLICY'
  | 'MANAGE_COMPLIANCE_RULES';

export type UserRole =
  | 'telecaller'
  | 'tl'
  | 'tl_head'
  | 'it'
  | 'owner'
  | 'cto';

export interface Team {
  id: string;
  name: string;
  location: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
  categoryName: string;
  volumeCount: number;
  volumeChangePercent: number; // e.g. +85%
  isHighScrutiny: boolean;
  complaintRiskScore: 'Low' | 'Medium' | 'High' | 'Critical';
  trendPoints: number[]; // Sparkline data points
  lastAuditDate: string;
  flaggedReasons: string[];
}

