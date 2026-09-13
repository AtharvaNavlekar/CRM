import bcryptjs from 'bcryptjs';
import { Lead, Call, Message, Ticket, User, AuditLog, Team, Tenant, SecurityAlert } from '../src/types';

export const DEFAULT_PASSWORD_HASH = bcryptjs.hashSync('password123', 10);

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant-apex',
    name: 'Apex Realty & Financial Services',
    slug: 'apex-realty',
    status: 'active',
    createdAt: '2026-01-15T08:00:00.000Z',
    tier: 'enterprise',
    primaryContactName: 'Rahul Sharma',
    primaryContactEmail: 'rahul@telecrm.in',
    leadCap: 50000,
    userCap: 100
  },
  {
    id: 'tenant-zenith',
    name: 'Zenith EdTech & Career Solutions',
    slug: 'zenith-edtech',
    status: 'active',
    createdAt: '2026-02-01T10:30:00.000Z',
    tier: 'growth',
    primaryContactName: 'Sameer Rao',
    primaryContactEmail: 'sameer@zenithedtech.in',
    leadCap: 15000,
    userCap: 25
  },
  {
    id: 'tenant-horizon',
    name: 'Horizon Lending Partners',
    slug: 'horizon-lending',
    status: 'suspended',
    createdAt: '2026-02-10T14:00:00.000Z',
    suspendedAt: '2026-03-01T12:00:00.000Z',
    suspensionReason: 'Overdue subscription compliance review and TRAI spam complaint investigation.',
    tier: 'starter',
    primaryContactName: 'Aditi Deshpande',
    primaryContactEmail: 'aditi@horizonlending.in',
    leadCap: 5000,
    userCap: 10
  }
];

export const TEAMS: Team[] = [
  { id: 'team-mumbai', name: 'Mumbai Outbound Team', location: 'Mumbai', tenantId: 'tenant-apex' },
  { id: 'team-delhi', name: 'Delhi Enterprise Team', location: 'Delhi NCR', tenantId: 'tenant-apex' },
  { id: 'team-zenith-bengaluru', name: 'Bengaluru Admissions Desk', location: 'Bengaluru', tenantId: 'tenant-zenith' },
  { id: 'team-zenith-hyderabad', name: 'Hyderabad Student Outreach', location: 'Hyderabad', tenantId: 'tenant-zenith' }
];

export const INITIAL_USERS: User[] = [
  // ==========================================
  // Platform Staff Accounts (Global Scope)
  // ==========================================
  {
    id: 'usr-plat-admin',
    name: 'Alex Rivera (Platform Super Admin)',
    email: 'admin@platform.internal',
    role: 'platform_admin',
    isPlatformStaff: true,
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Principal Platform Operations Director',
    phone: '+1 415 555 0101'
  },
  {
    id: 'usr-plat-support',
    name: 'Elena Rostova (Platform Support)',
    email: 'support@platform.internal',
    role: 'platform_support',
    isPlatformStaff: true,
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    title: 'Senior Tenant Support Specialist',
    phone: '+1 415 555 0102'
  },
  {
    id: 'usr-plat-sec',
    name: 'Marcus Vance (SOC Lead)',
    email: 'security@platform.internal',
    role: 'platform_security',
    isPlatformStaff: true,
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: 'Lead Security Operations Analyst',
    phone: '+1 415 555 0103'
  },

  // ==========================================
  // Tenant 1: Apex Realty & Financial Services (tenant-apex)
  // ==========================================
  {
    id: 'usr-1',
    tenantId: 'tenant-apex',
    name: 'Rahul Sharma',
    email: 'rahul@telecrm.in',
    role: 'owner',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Owner & Managing Director',
    phone: '+91 98112 34567'
  },
  {
    id: 'usr-2',
    tenantId: 'tenant-apex',
    name: 'Priya Iyer',
    email: 'priya@telecrm.in',
    role: 'tl',
    teamId: 'team-mumbai',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    title: 'Team Lead - Mumbai',
    phone: '+91 98220 45678'
  },
  {
    id: 'usr-3',
    tenantId: 'tenant-apex',
    name: 'Amit Verma',
    email: 'amit@telecrm.in',
    role: 'telecaller',
    teamId: 'team-mumbai',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: 'Outbound Telecaller (Mumbai)',
    phone: '+91 98333 56789'
  },
  {
    id: 'usr-4',
    tenantId: 'tenant-apex',
    name: 'Sneha Kulkarni',
    email: 'sneha@telecrm.in',
    role: 'telecaller',
    teamId: 'team-delhi',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    title: 'Inside Sales Telecaller (Delhi)',
    phone: '+91 98444 67890'
  },
  {
    id: 'usr-5',
    tenantId: 'tenant-apex',
    name: 'Vikas Nair',
    email: 'vikas@telecrm.in',
    role: 'cto',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    title: 'Chief Technology Officer',
    phone: '+91 98555 12345'
  },
  {
    id: 'usr-6',
    tenantId: 'tenant-apex',
    name: 'Karan Patel',
    email: 'karan@telecrm.in',
    role: 'it',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    title: 'IT Systems Administrator',
    phone: '+91 98666 23456'
  },
  {
    id: 'usr-7',
    tenantId: 'tenant-apex',
    name: 'Ananya Roy',
    email: 'ananya@telecrm.in',
    role: 'tl_head',
    managesTeamIds: ['team-mumbai', 'team-delhi'],
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    title: 'Head of Telecalling Operations',
    phone: '+91 98777 34567'
  },

  // ==========================================
  // Tenant 2: Zenith EdTech & Career Solutions (tenant-zenith)
  // ==========================================
  {
    id: 'usr-zen-1',
    tenantId: 'tenant-zenith',
    name: 'Sameer Rao',
    email: 'sameer@zenithedtech.in',
    role: 'owner',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    title: 'Founder & CEO - Zenith',
    phone: '+91 98200 90001'
  },
  {
    id: 'usr-zen-2',
    tenantId: 'tenant-zenith',
    name: 'Kavita Menon',
    email: 'kavita@zenithedtech.in',
    role: 'tl',
    teamId: 'team-zenith-bengaluru',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Admissions Lead (Bengaluru)',
    phone: '+91 98200 90002'
  },
  {
    id: 'usr-zen-3',
    tenantId: 'tenant-zenith',
    name: 'Arjun Das',
    email: 'arjun@zenithedtech.in',
    role: 'telecaller',
    teamId: 'team-zenith-bengaluru',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    title: 'Senior Education Counselor',
    phone: '+91 98200 90003'
  },
  {
    id: 'usr-zen-4',
    tenantId: 'tenant-zenith',
    name: 'Meera Nambisan',
    email: 'meera@zenithedtech.in',
    role: 'telecaller',
    teamId: 'team-zenith-hyderabad',
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    title: 'Student Enrollment Specialist',
    phone: '+91 98200 90004'
  }
];

const now = new Date();
const subtractHours = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const addHours = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

export const INITIAL_LEADS: Lead[] = [
  // Tenant Apex Leads
  {
    id: 'lead-101',
    tenantId: 'tenant-apex',
    name: 'Vikram Malhotra',
    phone: '+91 98201 12345',
    source: 'IndiaMART',
    stage: 'New',
    assignedRepId: 'usr-3',
    assignedRepName: 'Amit Verma',
    teamId: 'team-mumbai',
    createdDate: subtractHours(3),
    notes: 'Inquired about 3 BHK luxury apartment in Gurgaon Sector 65. Budget 2.5 Cr.',
    industry: 'Real Estate',
    value: 25000000,
    callbackReminder: addHours(2)
  },
  {
    id: 'lead-102',
    tenantId: 'tenant-apex',
    name: 'Ananya Deshmukh',
    phone: '+91 98199 87654',
    source: 'Website',
    stage: 'Contacted',
    assignedRepId: 'usr-3',
    assignedRepName: 'Amit Verma',
    teamId: 'team-mumbai',
    createdDate: subtractHours(18),
    notes: 'Looking for full-stack data science executive certification. Needs syllabus and EMI options.',
    industry: 'Education',
    value: 125000,
    callbackReminder: addHours(4)
  },
  {
    id: 'lead-103',
    tenantId: 'tenant-apex',
    name: 'Rajesh K. Singhania',
    phone: '+91 98310 99887',
    source: 'WhatsApp',
    stage: 'Follow-up',
    assignedRepId: 'usr-4',
    assignedRepName: 'Sneha Kulkarni',
    teamId: 'team-delhi',
    createdDate: subtractHours(36),
    notes: 'SME business loan requirement of 45 Lakhs for textile machinery expansion in Surat.',
    industry: 'Lending',
    value: 4500000,
    callbackReminder: addHours(1)
  },
  {
    id: 'lead-104',
    tenantId: 'tenant-apex',
    name: 'Pooja Bhattacharya',
    phone: '+91 98450 11223',
    source: 'Google Ads',
    stage: 'Negotiation',
    assignedRepId: 'usr-4',
    assignedRepName: 'Sneha Kulkarni',
    teamId: 'team-delhi',
    createdDate: subtractHours(60),
    notes: 'Family health insurance floater policy for 4 members (1 Cr cover). Sent plan comparisons.',
    industry: 'Insurance',
    value: 48000,
    callbackReminder: null
  },
  {
    id: 'lead-105',
    tenantId: 'tenant-apex',
    name: 'Karan Mehra',
    phone: '+91 98100 44556',
    source: 'Facebook',
    stage: 'Won',
    assignedRepId: 'usr-3',
    assignedRepName: 'Amit Verma',
    teamId: 'team-mumbai',
    createdDate: subtractHours(90),
    notes: 'Commercial office space in Whitefield Bangalore. Token amount received via RTGS!',
    industry: 'Real Estate',
    value: 8500000,
    callbackReminder: null
  },
  {
    id: 'lead-106',
    tenantId: 'tenant-apex',
    name: 'Deepak Agrawal',
    phone: '+91 97200 66778',
    source: 'Manual',
    stage: 'Lost',
    assignedRepId: 'usr-4',
    assignedRepName: 'Sneha Kulkarni',
    teamId: 'team-delhi',
    createdDate: subtractHours(120),
    notes: 'Decided to postpone business term loan until next fiscal quarter.',
    industry: 'Lending',
    value: 2000000,
    callbackReminder: null
  },
  {
    id: 'lead-107',
    tenantId: 'tenant-apex',
    name: 'Dr. Sunita Nambiar',
    phone: '+91 98840 77889',
    source: 'Website',
    stage: 'New',
    assignedRepId: 'usr-3',
    assignedRepName: 'Amit Verma',
    teamId: 'team-mumbai',
    createdDate: subtractHours(5),
    notes: 'Doctor clinic equipment loan request. Needs instant sanction letter.',
    industry: 'Lending',
    value: 1500000,
    callbackReminder: addHours(6)
  },
  {
    id: 'lead-108',
    tenantId: 'tenant-apex',
    name: 'Rohan Joshi',
    phone: '+91 99230 33445',
    source: 'WhatsApp',
    stage: 'Follow-up',
    assignedRepId: 'usr-4',
    assignedRepName: 'Sneha Kulkarni',
    teamId: 'team-delhi',
    createdDate: subtractHours(48),
    notes: '2 BHK in Pune Wakad. Visited site last Saturday, awaiting spouse feedback.',
    industry: 'Real Estate',
    value: 6800000,
    callbackReminder: addHours(3)
  },

  // Tenant Zenith Leads (Strictly isolated to Zenith EdTech)
  {
    id: 'lead-zen-201',
    tenantId: 'tenant-zenith',
    name: 'Siddharth Varma',
    phone: '+91 98765 11223',
    source: 'LinkedIn Ads',
    stage: 'New',
    assignedRepId: 'usr-zen-3',
    assignedRepName: 'Arjun Das',
    teamId: 'team-zenith-bengaluru',
    createdDate: subtractHours(2),
    notes: 'Inquired about Cloud DevOps PG Diploma for working engineers.',
    industry: 'Education',
    value: 220000,
    callbackReminder: addHours(3)
  },
  {
    id: 'lead-zen-202',
    tenantId: 'tenant-zenith',
    name: 'Aishwarya Rane',
    phone: '+91 98765 22334',
    source: 'Website',
    stage: 'Follow-up',
    assignedRepId: 'usr-zen-4',
    assignedRepName: 'Meera Nambisan',
    teamId: 'team-zenith-hyderabad',
    createdDate: subtractHours(20),
    notes: 'Requested brochure and syllabus for AI Product Management certificate.',
    industry: 'Education',
    value: 180000,
    callbackReminder: addHours(5)
  },
  {
    id: 'lead-zen-203',
    tenantId: 'tenant-zenith',
    name: 'Nikhil Saxena',
    phone: '+91 98765 33445',
    source: 'Referral',
    stage: 'Won',
    assignedRepId: 'usr-zen-3',
    assignedRepName: 'Arjun Das',
    teamId: 'team-zenith-bengaluru',
    createdDate: subtractHours(72),
    notes: 'Enrolled in Full-Stack Java Bootcamp. Full payment received via Razorpay.',
    industry: 'Education',
    value: 150000,
    callbackReminder: null
  }
];

export const INITIAL_CALLS: Call[] = [
  // Apex calls
  {
    id: 'call-201',
    tenantId: 'tenant-apex',
    leadId: 'lead-103',
    leadName: 'Rajesh K. Singhania',
    leadPhone: '+91 98310 99887',
    repId: 'usr-4',
    repName: 'Sneha Kulkarni',
    timestamp: subtractHours(4),
    duration: 185,
    outcome: 'Follow-up',
    notes: 'Discussed GST filings and 2 years ITR requirements. Client will email documents by 4 PM.',
    recordingSimulated: true
  },
  {
    id: 'call-202',
    tenantId: 'tenant-apex',
    leadId: 'lead-102',
    leadName: 'Ananya Deshmukh',
    leadPhone: '+91 98199 87654',
    repId: 'usr-3',
    repName: 'Amit Verma',
    timestamp: subtractHours(6),
    duration: 310,
    outcome: 'Interested',
    notes: 'Clarified placement assistance and batch timings (weekend). Agreed for scholarship test.',
    recordingSimulated: true
  },
  {
    id: 'call-203',
    tenantId: 'tenant-apex',
    leadId: 'lead-104',
    leadName: 'Pooja Bhattacharya',
    leadPhone: '+91 98450 11223',
    repId: 'usr-4',
    repName: 'Sneha Kulkarni',
    timestamp: subtractHours(12),
    duration: 420,
    outcome: 'Follow-up',
    notes: 'Negotiating cashless hospital network riders. Requested 5% festive discount waiver.',
    recordingSimulated: true
  },
  {
    id: 'call-204',
    tenantId: 'tenant-apex',
    leadId: 'lead-105',
    leadName: 'Karan Mehra',
    leadPhone: '+91 98100 44556',
    repId: 'usr-3',
    repName: 'Amit Verma',
    timestamp: subtractHours(24),
    duration: 540,
    outcome: 'Converted',
    notes: 'Finalized builder agreement terms. Payment confirmed.',
    recordingSimulated: true
  },
  {
    id: 'call-205',
    tenantId: 'tenant-apex',
    leadId: 'lead-106',
    leadName: 'Deepak Agrawal',
    leadPhone: '+91 97200 66778',
    repId: 'usr-4',
    repName: 'Sneha Kulkarni',
    timestamp: subtractHours(30),
    duration: 95,
    outcome: 'Not interested',
    notes: 'Client stated interest rates higher than private bank offer.',
    recordingSimulated: true
  },

  // Zenith calls
  {
    id: 'call-zen-301',
    tenantId: 'tenant-zenith',
    leadId: 'lead-zen-201',
    leadName: 'Siddharth Varma',
    leadPhone: '+91 98765 11223',
    repId: 'usr-zen-3',
    repName: 'Arjun Das',
    timestamp: subtractHours(1.5),
    duration: 240,
    outcome: 'Follow-up',
    notes: 'Reviewed candidate work experience in QA. Recommended Cloud Architecture track.',
    recordingSimulated: true
  },
  {
    id: 'call-zen-302',
    tenantId: 'tenant-zenith',
    leadId: 'lead-zen-203',
    leadName: 'Nikhil Saxena',
    leadPhone: '+91 98765 33445',
    repId: 'usr-zen-3',
    repName: 'Arjun Das',
    timestamp: subtractHours(70),
    duration: 480,
    outcome: 'Converted',
    notes: 'Discussed batch commencement date and sent LMS credentials after admission fee receipt.',
    recordingSimulated: true
  }
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-301',
    tenantId: 'tenant-apex',
    leadId: 'lead-103',
    direction: 'outbound',
    text: 'Namaste Rajesh ji, this is Sneha from TeleCRM lending desk. Here is the checklist of documents needed for your 45L business loan.',
    timestamp: subtractHours(5),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-302',
    tenantId: 'tenant-apex',
    leadId: 'lead-103',
    direction: 'inbound',
    text: 'Ji Sneha ji, I have the 2-year ITR ready. Can we discuss processing fee waivers on the call?',
    timestamp: subtractHours(4.5),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-303',
    tenantId: 'tenant-apex',
    leadId: 'lead-103',
    direction: 'outbound',
    text: 'Sure sir, I have marked a callback reminder for today at 3:30 PM. We will get you the best subvention rates!',
    timestamp: subtractHours(4),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-304',
    tenantId: 'tenant-apex',
    leadId: 'lead-101',
    direction: 'outbound',
    text: 'Hello Vikram ji, thank you for your inquiry on IndiaMART for Sector 65 luxury towers. Would you prefer a digital brochure over WhatsApp?',
    timestamp: subtractHours(2),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-305',
    tenantId: 'tenant-apex',
    leadId: 'lead-102',
    direction: 'outbound',
    text: 'Hi Ananya! Thanks for your interest in our Executive AI & Data Science Program. Here is the curriculum link: https://telecrm.in/curriculum',
    timestamp: subtractHours(17),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-zen-401',
    tenantId: 'tenant-zenith',
    leadId: 'lead-zen-202',
    direction: 'outbound',
    text: 'Hello Aishwarya, welcome to Zenith EdTech! Here is the downloadable PDF for our AI Product Management syllabus.',
    timestamp: subtractHours(19),
    deliveryStatus: 'Delivered'
  }
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'tkt-401',
    tenantId: 'tenant-apex',
    subject: 'Urgent: Sanction letter draft pending verification for Surat client',
    status: 'In Progress',
    createdDate: subtractHours(1.5),
    slaDueTime: addHours(2.5),
    priority: 'High',
    leadId: 'lead-103',
    leadName: 'Rajesh K. Singhania',
    assignedRepId: 'usr-4',
    replies: [
      {
        id: 'rep-1',
        sender: 'Sneha Kulkarni',
        senderRole: 'telecaller',
        text: 'Client submitted GST returns. Credit team please expedite pre-approval letter.',
        timestamp: subtractHours(1.2)
      },
      {
        id: 'rep-2',
        sender: 'Priya Iyer',
        senderRole: 'tl',
        text: 'Reviewing collateral now. Target dispatch within 1 hour.',
        timestamp: subtractHours(0.8)
      }
    ]
  },
  {
    id: 'tkt-402',
    tenantId: 'tenant-apex',
    subject: 'IndiaMART API webhook lead duplication issue reported',
    status: 'Open',
    createdDate: subtractHours(0.8),
    slaDueTime: addHours(3.2),
    priority: 'Medium',
    leadId: 'lead-101',
    leadName: 'Vikram Malhotra',
    assignedRepId: 'usr-3',
    replies: [
      {
        id: 'rep-3',
        sender: 'Amit Verma',
        senderRole: 'telecaller',
        text: 'Noticed same mobile number received twice with 2-minute gap.',
        timestamp: subtractHours(0.5)
      }
    ]
  },
  {
    id: 'tkt-403',
    tenantId: 'tenant-apex',
    subject: 'Refund request for cancelled property site visit pass',
    status: 'Resolved',
    createdDate: subtractHours(10),
    slaDueTime: subtractHours(6),
    priority: 'Low',
    leadId: 'lead-106',
    leadName: 'Deepak Agrawal',
    assignedRepId: 'usr-4',
    replies: [
      {
        id: 'rep-4',
        sender: 'Sneha Kulkarni',
        senderRole: 'telecaller',
        text: 'Customer requested cancellation due to personal travel.',
        timestamp: subtractHours(9.5)
      },
      {
        id: 'rep-5',
        sender: 'Rahul Sharma',
        senderRole: 'owner',
        text: 'Refund of ₹999 processed to source UPI ID. Ticket closed.',
        timestamp: subtractHours(7)
      }
    ]
  },
  {
    id: 'tkt-zen-501',
    tenantId: 'tenant-zenith',
    subject: 'Student LMS portal access delay after course registration',
    status: 'Open',
    createdDate: subtractHours(3),
    slaDueTime: addHours(1),
    priority: 'High',
    leadId: 'lead-zen-203',
    leadName: 'Nikhil Saxena',
    assignedRepId: 'usr-zen-3',
    replies: [
      {
        id: 'rep-zen-1',
        sender: 'Arjun Das',
        senderRole: 'telecaller',
        text: 'Student enrolled and submitted payment proof. IT desk please activate learning portal ID.',
        timestamp: subtractHours(2.8)
      }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    tenantId: 'tenant-apex',
    timestamp: subtractHours(2),
    userId: 'usr-1',
    userName: 'Rahul Sharma',
    userRole: 'owner',
    action: 'SYSTEM_INITIALIZED',
    details: 'DialPulse CRM initialized with Apex Realty tenant and sample pipeline.',
    ip: '103.21.124.50'
  },
  {
    id: 'aud-2',
    tenantId: 'tenant-apex',
    timestamp: subtractHours(1.5),
    userId: 'usr-3',
    userName: 'Amit Verma',
    userRole: 'telecaller',
    action: 'LEAD_STAGE_CHANGED',
    details: 'Changed Vikram Malhotra stage from New to Contacted.',
    ip: '103.21.124.52'
  },
  {
    id: 'aud-3',
    tenantId: 'tenant-apex',
    timestamp: subtractHours(1),
    userId: 'usr-4',
    userName: 'Sneha Kulkarni',
    userRole: 'telecaller',
    action: 'CALL_LOGGED',
    details: 'Logged 3m 5s follow-up call with Rajesh K. Singhania.',
    ip: '103.21.124.88'
  },
  {
    id: 'aud-zen-1',
    tenantId: 'tenant-zenith',
    timestamp: subtractHours(1.8),
    userId: 'usr-zen-3',
    userName: 'Arjun Das',
    userRole: 'telecaller',
    action: 'CALL_LOGGED',
    details: 'Completed counseling session with Siddharth Varma for Cloud DevOps program.',
    ip: '103.21.124.99'
  }
];

export const INITIAL_SECURITY_ALERTS: SecurityAlert[] = [
  {
    id: 'sec-alert-1',
    severity: 'high',
    title: 'Cross-Tenant Scope Breach Attempt Detected',
    description: 'User in tenant-apex attempted to access lead lead-zen-201 belonging to tenant-zenith via direct ID request.',
    tenantId: 'tenant-apex',
    sourceIp: '103.21.124.52',
    timestamp: subtractHours(1.1),
    resolved: false
  },
  {
    id: 'sec-alert-2',
    severity: 'medium',
    title: 'Rapid Telecalling Rate Limit Warning',
    description: 'Tenant Zenith recorded 15 consecutive API calls within a 10-second interval.',
    tenantId: 'tenant-zenith',
    sourceIp: '103.21.124.99',
    timestamp: subtractHours(3.5),
    resolved: true
  }
];

export const INITIAL_BILLING_RECORDS = [
  {
    id: 'inv-apex-1',
    tenantId: 'tenant-apex',
    invoiceId: 'INV-2026-08-01-APEX',
    amount: 15000,
    currency: 'INR',
    status: 'paid',
    dueDate: '2026-08-15T00:00:00.000Z',
    paidAt: '2026-08-14T10:30:00.000Z'
  },
  {
    id: 'inv-apex-2',
    tenantId: 'tenant-apex',
    invoiceId: 'INV-2026-09-01-APEX',
    amount: 15000,
    currency: 'INR',
    status: 'pending',
    dueDate: '2026-09-15T00:00:00.000Z'
  },
  {
    id: 'inv-zenith-1',
    tenantId: 'tenant-zenith',
    invoiceId: 'INV-2026-09-01-ZEN',
    amount: 8000,
    currency: 'INR',
    status: 'paid',
    dueDate: '2026-09-15T00:00:00.000Z',
    paidAt: '2026-09-02T14:20:00.000Z'
  },
  {
    id: 'inv-horizon-1',
    tenantId: 'tenant-horizon',
    invoiceId: 'INV-2026-08-01-HOR',
    amount: 3000,
    currency: 'INR',
    status: 'failed',
    dueDate: '2026-08-15T00:00:00.000Z'
  }
];

export const INITIAL_FEATURE_FLAGS = [
  {
    id: 'flag-reporting-v2',
    key: 'new_reporting_widget',
    name: 'Advanced Reporting V2',
    description: 'Enable the new React-based analytics dashboard with drill-down capabilities.',
    enabledGlobally: false,
    enabledForTenantIds: ['tenant-apex'],
    rolloutPercentage: 10
  },
  {
    id: 'flag-whatsapp-api',
    key: 'whatsapp_cloud_api',
    name: 'WhatsApp Cloud API Direct Integration',
    description: 'Bypass legacy provider and use Meta direct Cloud API for WhatsApp.',
    enabledGlobally: true,
    enabledForTenantIds: [],
    rolloutPercentage: 100
  }
];
