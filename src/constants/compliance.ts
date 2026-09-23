import {
  CallerIdentityConfig,
  CallReasonTag,
  ContactFrequencyRules,
  ChannelRoutingRule,
  ComplianceWatchCategory
} from '../types';

export const DEFAULT_CALLER_IDENTITY: CallerIdentityConfig = {
  legalBusinessName: 'DialPulse Solutions Private Limited',
  displayName: 'DialPulse Telephony',
  registrationNumber: 'CIN-U72900MH2023PTC398124',
  logoUrl: '/favicon.ico',
  businessWebsite: 'https://dialpulse.com',
  registeredAddress: 'Level 5, Platina Tower, Bandra Kurla Complex, Mumbai, MH 400051',
  callingNumbers: [
    {
      id: 'num-01',
      number: '+91 22 4893 2100',
      label: 'Primary Mumbai PRI Trunk',
      status: 'Verified',
      attestationLevel: 'A (Full Attestation)',
      carrier: 'Tata Tele Business',
      cnamRegisteredName: 'DialPulse Corp',
      lastAuditDate: '2026-01-15',
      verifiedAnswerRate: 64,
      unverifiedAnswerRate: 21
    },
    {
      id: 'num-02',
      number: '+91 80 6912 8400',
      label: 'Bengaluru Cloud PBX Line',
      status: 'Verified',
      attestationLevel: 'A (Full Attestation)',
      carrier: 'Airtel Enterprise',
      cnamRegisteredName: 'DialPulse South',
      lastAuditDate: '2026-02-01',
      verifiedAnswerRate: 62,
      unverifiedAnswerRate: 20
    },
    {
      id: 'num-03',
      number: '+91 11 4120 7300',
      label: 'Delhi Corporate Outbound',
      status: 'Verified',
      attestationLevel: 'B (Partial)',
      carrier: 'Jio Business',
      cnamRegisteredName: 'DialPulse North',
      lastAuditDate: '2026-02-18',
      verifiedAnswerRate: 59,
      unverifiedAnswerRate: 19
    }
  ]
};

export const DEFAULT_CALL_REASONS: CallReasonTag[] = [
  {
    id: 'cr-01',
    name: 'Lead Inquiry Follow-up',
    category: 'General Inquiry',
    attachedStage: 'New',
    campaign: 'Website Inbound',
    isHighScrutiny: false,
    requiredForDialing: true,
    description: 'Direct response to customer inquiry on website or ads within 24h',
    activeCallsCount: 42
  },
  {
    id: 'cr-02',
    name: 'Product Demonstration Confirmation',
    category: 'Product Demo',
    attachedStage: 'Follow-up',
    campaign: 'Demo Bookings',
    isHighScrutiny: false,
    requiredForDialing: true,
    description: 'Pre-scheduled 1-to-1 walkthrough verification call',
    activeCallsCount: 18
  },
  {
    id: 'cr-03',
    name: 'Commercial Proposal Discussion',
    category: 'Loan Follow-up',
    attachedStage: 'Negotiation',
    campaign: 'Enterprise Pipeline',
    isHighScrutiny: true,
    requiredForDialing: true,
    description: 'Active proposal terms and discount clarification with decision maker',
    activeCallsCount: 12
  },
  {
    id: 'cr-04',
    name: 'Post-Call Resolution & Support',
    category: 'Customer Care',
    attachedStage: 'Contacted',
    campaign: 'Customer Success',
    isHighScrutiny: false,
    requiredForDialing: false,
    description: 'Resolving reported ticket or technical question',
    activeCallsCount: 29
  }
];

export const DEFAULT_FREQUENCY_RULES: ContactFrequencyRules = {
  callCapMaxAttempts: 3,
  callCapDays: 1,
  whatsAppCapMaxAttempts: 5,
  whatsAppCapDays: 7,
  smsCapMaxAttempts: 2,
  smsCapDays: 1,
  quietHoursEnabled: true,
  quietHoursStart: '19:00',
  quietHoursEnd: '09:00',
  enforceTimezone: 'Asia/Kolkata',
  timezone: 'Asia/Kolkata',
  dncEnforcement: true,
  optOutEnforcement: true,
  pauseEnforcement: true,
  preferredChannelEnforcement: true
};

export const DEFAULT_CHANNEL_ROUTING_RULES: ChannelRoutingRule[] = [
  {
    id: 'crr-01',
    pipelineStageOrCampaign: 'Inbound Web Leads',
    primaryChannel: 'Call',
    waitPeriodHours: 2,
    fallbackChannel: 'WhatsApp',
    triggerCondition: 'Unanswered call',
    active: true,
    notes: 'Auto-dispatch WhatsApp greeting if outbound call unanswered after 2 hours'
  },
  {
    id: 'crr-02',
    pipelineStageOrCampaign: 'Quiet Hours Inbound',
    primaryChannel: 'WhatsApp',
    waitPeriodHours: 0,
    fallbackChannel: 'None',
    triggerCondition: 'No response',
    active: true,
    notes: 'Immediate conversational WhatsApp template during TRAI quiet hours (8PM-8AM)'
  }
];

export const DEFAULT_COMPLIANCE_WATCH: ComplianceWatchCategory[] = [
  {
    id: 'cw-01',
    categoryName: 'TRAI Quiet Hours (8PM - 8AM IST)',
    volumeCount: 184,
    volumeChangePercent: -12,
    isHighScrutiny: true,
    complaintRiskScore: 'Low',
    trendPoints: [12, 10, 8, 5, 2, 0, 0],
    lastAuditDate: '2026-03-20',
    flaggedReasons: ['Quiet hours restriction enforced']
  },
  {
    id: 'cw-02',
    categoryName: 'Contact Fatigue Threshold (3/day, 6/week)',
    volumeCount: 96,
    volumeChangePercent: -28,
    isHighScrutiny: true,
    complaintRiskScore: 'Low',
    trendPoints: [35, 28, 20, 15, 10, 5, 0],
    lastAuditDate: '2026-03-21',
    flaggedReasons: ['Frequency cap automatically applied']
  },
  {
    id: 'cw-03',
    categoryName: 'Lead Preference Self-Serve Sync',
    volumeCount: 42,
    volumeChangePercent: 5,
    isHighScrutiny: false,
    complaintRiskScore: 'Low',
    trendPoints: [5, 8, 12, 18, 25, 34, 42],
    lastAuditDate: '2026-03-22',
    flaggedReasons: ['Preferred channel honored']
  }
];

export const VERIFIED_CALL_STATS = {
  verifiedTrunksCount: 3,
  averageReputationScore: 96.3,
  spamFlaggedRatePct: 0.03,
  carrierHealth: 'Excellent (A+)',
  verifiedAnswerRate: 62.4,
  blockedAttemptsToday: 14,
  leadsNearCapCount: 8,
  leadsAtCapCount: 3
};
