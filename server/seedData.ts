import bcryptjs from 'bcryptjs';
import { Lead, Call, Message, Ticket, User, AuditLog, Team } from '../src/types';

export const DEFAULT_PASSWORD_HASH = bcryptjs.hashSync('password123', 10);

export const TEAMS: Team[] = [
  { id: 'team-mumbai', name: 'Mumbai Outbound Team', location: 'Mumbai' },
  { id: 'team-delhi', name: 'Delhi Enterprise Team', location: 'Delhi NCR' }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
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
    name: 'Ananya Roy',
    email: 'ananya@telecrm.in',
    role: 'tl_head',
    managesTeamIds: ['team-mumbai', 'team-delhi'],
    passwordHash: DEFAULT_PASSWORD_HASH,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    title: 'Head of Telecalling Operations',
    phone: '+91 98777 34567'
  }
];

const now = new Date();
const subtractHours = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const addHours = (h: number) => new Date(now.getTime() + h * 3600000).toISOString();

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-101',
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
  }
];

export const INITIAL_CALLS: Call[] = [
  {
    id: 'call-201',
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
  }
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg-301',
    leadId: 'lead-103',
    direction: 'outbound',
    text: 'Namaste Rajesh ji, this is Sneha from TeleCRM lending desk. Here is the checklist of documents needed for your 45L business loan.',
    timestamp: subtractHours(5),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-302',
    leadId: 'lead-103',
    direction: 'inbound',
    text: 'Ji Sneha ji, I have the 2-year ITR ready. Can we discuss processing fee waivers on the call?',
    timestamp: subtractHours(4.5),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-303',
    leadId: 'lead-103',
    direction: 'outbound',
    text: 'Sure sir, I have marked a callback reminder for today at 3:30 PM. We will get you the best subvention rates!',
    timestamp: subtractHours(4),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-304',
    leadId: 'lead-101',
    direction: 'outbound',
    text: 'Hello Vikram ji, thank you for your inquiry on IndiaMART for Sector 65 luxury towers. Would you prefer a digital brochure over WhatsApp?',
    timestamp: subtractHours(2),
    deliveryStatus: 'Delivered'
  },
  {
    id: 'msg-305',
    leadId: 'lead-102',
    direction: 'outbound',
    text: 'Hi Ananya! Thanks for your interest in our Executive AI & Data Science Program. Here is the curriculum link: https://telecrm.in/curriculum',
    timestamp: subtractHours(17),
    deliveryStatus: 'Delivered'
  }
];

export const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'tkt-401',
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
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: subtractHours(2),
    userId: 'usr-1',
    userName: 'Rahul Sharma',
    userRole: 'owner',
    action: 'SYSTEM_INITIALIZED',
    details: 'TeleCRM 2.0 database initialized with 8 sample leads and role assignments.',
    ip: '103.21.124.50'
  },
  {
    id: 'aud-2',
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
    timestamp: subtractHours(1),
    userId: 'usr-4',
    userName: 'Sneha Kulkarni',
    userRole: 'telecaller',
    action: 'CALL_LOGGED',
    details: 'Logged 3m 5s follow-up call with Rajesh K. Singhania.',
    ip: '103.21.124.88'
  }
];
