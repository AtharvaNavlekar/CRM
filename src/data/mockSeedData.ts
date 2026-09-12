// Seed mock data for DialPulse CRM
// Includes 120+ realistic leads, assignee rosters, dashboard metrics, leaderboard stats, and onboarding hub items

export interface MockLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyOrProject: string;
  status:
    | 'Fresh Lead'
    | 'Reheated'
    | 'RNR'
    | 'Call Back Later'
    | 'Recorded Demo Sent'
    | 'Webinar Scheduled'
    | 'Webinar Done'
    | '1-to-1 Demo Scheduled'
    | 'Relevant'
    | 'Quotation Shared'
    | 'Payment Pending'
    | 'Won'
    | 'Lost';
  rating: number; // 1 - 5 stars
  assignee: string;
  assigneeRole: string;
  createdOn: string; // relative string e.g. '4m ago', '2h ago', '2M ago'
  createdIso: string;
  source: 'Facebook Ads' | 'WhatsApp' | 'Website' | 'Google Ads' | 'IndiaMART' | 'Justdial' | 'TradeIndia' | 'Manual';
  industry: 'Real Estate' | 'Education' | 'Lending/Fintech' | 'Insurance' | 'Telesales';
  value: number; // in INR
  lastCallOutcome?: string;
  notes?: string;
  fatigueStatus?: 'normal' | 'near_cap' | 'capped';
  contactAttempts7d?: {
    calls: number;
    whatsapp: number;
    sms: number;
  };
  blockedReason?: string;
  preferences?: {
    preferredChannel: 'Call' | 'WhatsApp' | 'SMS' | 'Email' | 'Any';
    preferredTimeWindow: 'Morning (10 AM - 1 PM)' | 'Afternoon (2 PM - 5 PM)' | 'Evening (5 PM - 7 PM)' | 'Anytime';
    allowedTopics: string[];
    isPaused30Days: boolean;
    pausedUntil?: string | null;
    isOptedOut: boolean;
    optOutReason?: string;
    updatedAt: string;
  };
  declaredCallReason?: string;
  assignedCampaign?: string;
}

export const TEAM_MEMBERS = [
  { id: 'u1', name: 'Priya Sharma', role: 'Senior Telesales Executive', department: 'Sales', avatarInitial: 'PS' },
  { id: 'u2', name: 'Rohan Mehta', role: 'Inside Sales Specialist', department: 'Sales', avatarInitial: 'RM' },
  { id: 'u3', name: 'Vikram Patel', role: 'Senior Loan Officer', department: 'Sales', avatarInitial: 'VP' },
  { id: 'u4', name: 'Neha Gupta', role: 'Real Estate Portfolio Manager', department: 'Sales', avatarInitial: 'NG' },
  { id: 'u5', name: 'Ananya Roy', role: 'Course Admission Counselor', department: 'Sales', avatarInitial: 'AR' },
  { id: 'u6', name: 'Amit Verma', role: 'Telesales Rep', department: 'Sales', avatarInitial: 'AV' },
  { id: 'u7', name: 'Kavita Pillai', role: 'Inbound WhatsApp Specialist', department: 'Sales', avatarInitial: 'KP' },
  { id: 'u8', name: 'Suresh Iyer', role: 'SME Lending Lead', department: 'Sales', avatarInitial: 'SI' }
];

export const PIPELINE_STAGES = [
  'Fresh Lead',
  'Reheated',
  'RNR',
  'Call Back Later',
  'Recorded Demo Sent',
  'Webinar Scheduled',
  'Webinar Done',
  '1-to-1 Demo Scheduled',
  'Relevant',
  'Quotation Shared',
  'Payment Pending',
  'Won',
  'Lost'
] as const;

export const PIPELINE_STAGE_COLORS: Record<string, string> = {
  'Fresh Lead': '#0284c7', // sky-600
  'Reheated': '#6366f1', // indigo-500
  'RNR': '#f43f5e', // rose-500
  'Call Back Later': '#f59e0b', // amber-500
  'Recorded Demo Sent': '#8b5cf6', // purple-500
  'Webinar Scheduled': '#d97706', // amber-600
  'Webinar Done': '#10b981', // emerald-500
  '1-to-1 Demo Scheduled': '#06b6d4', // cyan-500
  'Relevant': '#14b8a6', // teal-500
  'Quotation Shared': '#3b82f6', // blue-500
  'Payment Pending': '#eab308', // yellow-500
  'Won': '#059669', // emerald-600
  'Lost': '#dc2626' // red-600
};

// Generate 120+ authentic leads with realistic Indian SMB/telesales personas
const FIRST_NAMES = [
  'Rajesh', 'Siddharth', 'Manish', 'Karthik', 'Pooja', 'Sunita', 'Gaurav', 'Arun', 'Deepak', 'Swati',
  'Harish', 'Nikhil', 'Snehal', 'Tanvi', 'Vivek', 'Sachin', 'Divya', 'Ritu', 'Prashant', 'Ashish',
  'Meenakshi', 'Bhavesh', 'Alok', 'Shruti', 'Naveen', 'Sameer', 'Poonam', 'Varun', 'Hemant', 'Geeta',
  'Abhishek', 'Mayank', 'Ramesh', 'Sanjay', 'Tarun', 'Shweta', 'Farhan', 'Gurpreet', 'Jasleen', 'Kunal'
];

const LAST_NAMES = [
  'Singhania', 'Kapoor', 'Deshmukh', 'Chopra', 'Banerjee', 'Iyer', 'Bhatia', 'Malhotra', 'Rathore', 'Menon',
  'Agarwal', 'Reddy', 'Saxena', 'Pandey', 'Mishra', 'Nair', 'Kulkarni', 'Joshi', 'Chauhan', 'Verma',
  'Thakur', 'Goyal', 'Sinha', 'Dutta', 'Bansal', 'Goswami', 'Chawla', 'Tiwari', 'Mahajan', 'Salunkhe'
];

const PROJECTS_AND_PRODUCTS = [
  { name: 'Godrej Horizon 3BHK', industry: 'Real Estate' as const, value: 9500000 },
  { name: 'Prestige Park Square Villa', industry: 'Real Estate' as const, value: 14500000 },
  { name: 'Lodha Crown Luxury Flat', industry: 'Real Estate' as const, value: 7800000 },
  { name: 'Full Stack AI Engineering PG', industry: 'Education' as const, value: 185000 },
  { name: 'Executive MBA (Global)', industry: 'Education' as const, value: 450000 },
  { name: 'Data Science Certification', industry: 'Education' as const, value: 120000 },
  { name: 'SME Working Capital Loan ₹40L', industry: 'Lending/Fintech' as const, value: 4000000 },
  { name: 'Instant Unsecured Business Loan ₹15L', industry: 'Lending/Fintech' as const, value: 1500000 },
  { name: 'Term Life Insurance 2Cr Shield', industry: 'Insurance' as const, value: 48000 },
  { name: 'Family Health Guard Elite', industry: 'Insurance' as const, value: 36000 },
  { name: 'Commercial High-Street Retail Plot', industry: 'Real Estate' as const, value: 21000000 },
  { name: 'Doctor Professional Loan ₹30L', industry: 'Lending/Fintech' as const, value: 3000000 }
];

const SOURCES: MockLead['source'][] = [
  'Facebook Ads', 'WhatsApp', 'Website', 'Google Ads', 'IndiaMART', 'Justdial', 'TradeIndia', 'Manual'
];

const RELATIVE_TIMES = [
  '2m ago', '8m ago', '15m ago', '34m ago', '1h ago', '2h ago', '3h ago', '5h ago', '7h ago',
  '1d ago', '2d ago', '3d ago', '4d ago', '5d ago', '1w ago', '2w ago', '3w ago', '1M ago', '2M ago'
];

export function generateSeedLeads(): MockLead[] {
  const leads: MockLead[] = [];
  const stages = PIPELINE_STAGES;

  for (let i = 1; i <= 124; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length];
    const fullName = `${fn} ${ln}`;
    const prod = PROJECTS_AND_PRODUCTS[i % PROJECTS_AND_PRODUCTS.length];
    const rep = TEAM_MEMBERS[i % TEAM_MEMBERS.length];
    const stage = stages[i % stages.length];
    const relTime = RELATIVE_TIMES[i % RELATIVE_TIMES.length];
    const source = SOURCES[i % SOURCES.length];
    const rating = (i % 5) + 1; // 1 to 5 stars

    const phoneLast4 = (1000 + ((i * 73) % 9000)).toString();
    const phonePrefix = ['98201', '97112', '99450', '98801', '98334', '94120', '98990', '93214'][i % 8];

    // Compliance & fatigue seeding
    let fatigueStatus: 'normal' | 'near_cap' | 'capped' = 'normal';
    let blockedReason: string | undefined = undefined;
    let callAttempts = (i % 3);
    let waAttempts = (i % 4);

    if (i % 9 === 0) {
      fatigueStatus = 'capped';
      callAttempts = 3;
      blockedReason = 'Frequency cap reached: 3/3 calls in 7-day window. Outbound calling blocked for 24h.';
    } else if (i % 5 === 0) {
      fatigueStatus = 'near_cap';
      callAttempts = 2;
      blockedReason = 'At-risk: 2/3 calls logged in 7 days. Only 1 attempt remaining before automatic block.';
    }

    // Preferences seeding
    let preferredChannel: 'Call' | 'WhatsApp' | 'SMS' | 'Email' | 'Any' = 'Any';
    let isPaused30Days = false;
    let isOptedOut = false;
    let optOutReason: string | undefined = undefined;

    if (i % 7 === 0) {
      preferredChannel = 'WhatsApp';
    } else if (i % 11 === 0) {
      preferredChannel = 'Call';
    } else if (i % 23 === 0) {
      isPaused30Days = true;
    } else if (i % 31 === 0) {
      isOptedOut = true;
      optOutReason = 'Lead requested Do-Not-Disturb (DND) via preference link.';
    }

    const CALL_REASONS = [
      'Loan application follow-up',
      'Payment reminder',
      'New product offer',
      'Debt-reduction restructuring',
      'Site visit consultation',
      'Admission fee query'
    ];

    leads.push({
      id: `LEAD-${1000 + i}`,
      name: fullName,
      phone: `+91 ${phonePrefix} ${phoneLast4}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.in`,
      companyOrProject: prod.name,
      status: stage,
      rating: rating,
      assignee: rep.name,
      assigneeRole: rep.role,
      createdOn: relTime,
      createdIso: new Date(Date.now() - i * 3600 * 1000 * 4).toISOString(),
      source: source,
      industry: prod.industry,
      value: prod.value,
      lastCallOutcome: i % 3 === 0 ? 'Connected (Interested)' : i % 3 === 1 ? 'Ringing No Response' : 'Call Back requested',
      notes: `Inquired regarding ${prod.name}. High intent lead received via ${source}.`,
      fatigueStatus,
      blockedReason,
      contactAttempts7d: {
        calls: callAttempts,
        whatsapp: waAttempts,
        sms: i % 2
      },
      preferences: {
        preferredChannel,
        preferredTimeWindow: i % 3 === 0 ? 'Morning (10 AM - 1 PM)' : i % 3 === 1 ? 'Afternoon (2 PM - 5 PM)' : 'Evening (5 PM - 7 PM)',
        allowedTopics: isOptedOut ? [] : ['New product offers', 'Payment & billing reminders only', 'Site visits & consultations'],
        isPaused30Days,
        pausedUntil: isPaused30Days ? new Date(Date.now() + 24 * 3600 * 1000 * 22).toISOString() : null,
        isOptedOut,
        optOutReason,
        updatedAt: '2026-09-01T10:00:00.000Z'
      },
      declaredCallReason: CALL_REASONS[i % CALL_REASONS.length],
      assignedCampaign: i % 2 === 0 ? 'H2 India Outreach 2026' : 'Priority Inbound Follow-up'
    });
  }

  return leads;
}

export const MOCK_LEADS: MockLead[] = generateSeedLeads();

// Activity & Performance Widget Data (per assignee with Calls, Duration, Revenue)
export interface ActivityPerformanceRow {
  assignee: string;
  role: string;
  calls: number;
  durationMinutes: number;
  durationFormatted: string;
  revenue: number;
  revenueFormatted: string;
}

export const MOCK_ACTIVITY_PERFORMANCE: ActivityPerformanceRow[] = [
  { assignee: 'Priya Sharma', role: 'Senior Telesales', calls: 84, durationMinutes: 284, durationFormatted: '4h 44m', revenue: 1420000, revenueFormatted: '₹ 14.2 L' },
  { assignee: 'Rohan Mehta', role: 'Inside Sales', calls: 76, durationMinutes: 242, durationFormatted: '4h 02m', revenue: 1180000, revenueFormatted: '₹ 11.8 L' },
  { assignee: 'Vikram Patel', role: 'Loan Officer', calls: 68, durationMinutes: 215, durationFormatted: '3h 35m', revenue: 950000, revenueFormatted: '₹ 9.5 L' },
  { assignee: 'Neha Gupta', role: 'Portfolio Manager', calls: 62, durationMinutes: 198, durationFormatted: '3h 18m', revenue: 1680000, revenueFormatted: '₹ 16.8 L' },
  { assignee: 'Ananya Roy', role: 'Admission Counselor', calls: 58, durationMinutes: 176, durationFormatted: '2h 56m', revenue: 740000, revenueFormatted: '₹ 7.4 L' },
  { assignee: 'Amit Verma', role: 'Telesales Rep', calls: 52, durationMinutes: 160, durationFormatted: '2h 40m', revenue: 520000, revenueFormatted: '₹ 5.2 L' },
  { assignee: 'Kavita Pillai', role: 'WhatsApp Specialist', calls: 49, durationMinutes: 144, durationFormatted: '2h 24m', revenue: 490000, revenueFormatted: '₹ 4.9 L' },
  { assignee: 'Suresh Iyer', role: 'SME Lead', calls: 45, durationMinutes: 132, durationFormatted: '2h 12m', revenue: 880000, revenueFormatted: '₹ 8.8 L' }
];

// Follow Ups Widget Data (Upcoming, Late, Done, Cancel)
export interface FollowUpRow {
  assignee: string;
  upcoming: number; // amber
  late: number; // red
  done: number; // green
  cancel: number; // gray
  total: number;
}

export const MOCK_FOLLOW_UPS: FollowUpRow[] = [
  { assignee: 'Priya Sharma', upcoming: 14, late: 2, done: 28, cancel: 3, total: 47 },
  { assignee: 'Rohan Mehta', upcoming: 11, late: 4, done: 22, cancel: 2, total: 39 },
  { assignee: 'Vikram Patel', upcoming: 9, late: 1, done: 26, cancel: 4, total: 40 },
  { assignee: 'Neha Gupta', upcoming: 12, late: 3, done: 19, cancel: 1, total: 35 },
  { assignee: 'Ananya Roy', upcoming: 16, late: 5, done: 18, cancel: 2, total: 41 },
  { assignee: 'Amit Verma', upcoming: 8, late: 6, done: 15, cancel: 3, total: 32 },
  { assignee: 'Kavita Pillai', upcoming: 15, late: 1, done: 24, cancel: 0, total: 40 },
  { assignee: 'Suresh Iyer', upcoming: 7, late: 2, done: 17, cancel: 1, total: 27 }
];

// Saved Custom Filters Widget Data
export interface SavedFilterItem {
  id: string;
  name: string;
  description: string;
  fresh: number;
  active: number;
  won: number;
  lost: number;
}

export const MOCK_SAVED_FILTERS: SavedFilterItem[] = [
  { id: 'f1', name: 'All Incoming WhatsApp', description: 'Leads initiated via official WhatsApp Cloud API', fresh: 24, active: 48, won: 18, lost: 6 },
  { id: 'f2', name: 'Immediately Start', description: 'High-urgency callback requests within 15 mins', fresh: 12, active: 19, won: 9, lost: 2 },
  { id: 'f3', name: 'High Intent CIBIL > 750', description: 'Pre-qualified loan & premium estate applicants', fresh: 15, active: 31, won: 22, lost: 5 },
  { id: 'f4', name: 'Bangalore 3BHK Hot Buyers', description: 'Prestige & Godrej properties site-visit interested', fresh: 8, active: 27, won: 14, lost: 4 },
  { id: 'f5', name: 'Reheated Cold Dials', description: 'Past 60-day RNR leads reactivated for re-pitching', fresh: 38, active: 54, won: 7, lost: 19 },
  { id: 'f6', name: 'Webinar Attended (Yesterday)', description: 'Full attendance recorded, pending demo scheduling', fresh: 19, active: 42, won: 16, lost: 3 }
];

// Leaderboard Mock Data
export interface LeaderboardMember {
  rank: number;
  id: string;
  name: string;
  role: string;
  firstCallTime: string;
  lastCallTime: string;
  calls: number;
  durationMinutes: number;
  durationFormatted: string;
  sales: number;
  salesFormatted: string;
  // Deep detail stats
  callsDetail: {
    allCalls: number;
    distinctRepsCount: number;
    incoming: number;
    outgoing: number;
    missed: number;
    connected60sPlus: number; // Connected Calls (>= 60 sec)
    attemptedCalls: number;
  };
  tasksDetail: {
    late: number;
    pending: number;
    done: number;
    created: number;
  };
  whatsAppDetail: {
    incoming: number;
    outgoing: number;
    deliveryRate: string;
  };
}

export const MOCK_LEADERBOARD: LeaderboardMember[] = [
  {
    rank: 1,
    id: 'u1',
    name: 'Priya Sharma',
    role: 'Senior Telesales Executive',
    firstCallTime: '09:12 AM',
    lastCallTime: '06:48 PM',
    calls: 84,
    durationMinutes: 284,
    durationFormatted: '4h 44m',
    sales: 1420000,
    salesFormatted: '₹ 14,20,000',
    callsDetail: {
      allCalls: 84,
      distinctRepsCount: 1,
      incoming: 28,
      outgoing: 56,
      missed: 4,
      connected60sPlus: 54, // Distinct from attempted!
      attemptedCalls: 84
    },
    tasksDetail: {
      late: 2,
      pending: 14,
      done: 28,
      created: 44
    },
    whatsAppDetail: {
      incoming: 64,
      outgoing: 112,
      deliveryRate: '99.1%'
    }
  },
  {
    rank: 2,
    id: 'u4',
    name: 'Neha Gupta',
    role: 'Real Estate Portfolio Manager',
    firstCallTime: '09:05 AM',
    lastCallTime: '07:15 PM',
    calls: 62,
    durationMinutes: 198,
    durationFormatted: '3h 18m',
    sales: 1680000,
    salesFormatted: '₹ 16,80,000',
    callsDetail: {
      allCalls: 62,
      distinctRepsCount: 1,
      incoming: 19,
      outgoing: 43,
      missed: 2,
      connected60sPlus: 41,
      attemptedCalls: 62
    },
    tasksDetail: {
      late: 3,
      pending: 12,
      done: 19,
      created: 34
    },
    whatsAppDetail: {
      incoming: 42,
      outgoing: 86,
      deliveryRate: '98.8%'
    }
  },
  {
    rank: 3,
    id: 'u2',
    name: 'Rohan Mehta',
    role: 'Inside Sales Specialist',
    firstCallTime: '09:28 AM',
    lastCallTime: '06:30 PM',
    calls: 76,
    durationMinutes: 242,
    durationFormatted: '4h 02m',
    sales: 1180000,
    salesFormatted: '₹ 11,80,000',
    callsDetail: {
      allCalls: 76,
      distinctRepsCount: 1,
      incoming: 22,
      outgoing: 54,
      missed: 6,
      connected60sPlus: 46,
      attemptedCalls: 76
    },
    tasksDetail: {
      late: 4,
      pending: 11,
      done: 22,
      created: 37
    },
    whatsAppDetail: {
      incoming: 51,
      outgoing: 94,
      deliveryRate: '97.9%'
    }
  },
  {
    rank: 4,
    id: 'u3',
    name: 'Vikram Patel',
    role: 'Senior Loan Officer',
    firstCallTime: '09:40 AM',
    lastCallTime: '06:20 PM',
    calls: 68,
    durationMinutes: 215,
    durationFormatted: '3h 35m',
    sales: 950000,
    salesFormatted: '₹ 9,50,000',
    callsDetail: {
      allCalls: 68,
      distinctRepsCount: 1,
      incoming: 18,
      outgoing: 50,
      missed: 3,
      connected60sPlus: 43,
      attemptedCalls: 68
    },
    tasksDetail: {
      late: 1,
      pending: 9,
      done: 26,
      created: 36
    },
    whatsAppDetail: {
      incoming: 38,
      outgoing: 72,
      deliveryRate: '98.6%'
    }
  },
  {
    rank: 5,
    id: 'u8',
    name: 'Suresh Iyer',
    role: 'SME Lending Lead',
    firstCallTime: '09:15 AM',
    lastCallTime: '06:10 PM',
    calls: 45,
    durationMinutes: 132,
    durationFormatted: '2h 12m',
    sales: 880000,
    salesFormatted: '₹ 8,80,000',
    callsDetail: {
      allCalls: 45,
      distinctRepsCount: 1,
      incoming: 14,
      outgoing: 31,
      missed: 2,
      connected60sPlus: 32,
      attemptedCalls: 45
    },
    tasksDetail: {
      late: 2,
      pending: 7,
      done: 17,
      created: 26
    },
    whatsAppDetail: {
      incoming: 29,
      outgoing: 58,
      deliveryRate: '99.4%'
    }
  },
  {
    rank: 6,
    id: 'u5',
    name: 'Ananya Roy',
    role: 'Course Admission Counselor',
    firstCallTime: '09:50 AM',
    lastCallTime: '06:55 PM',
    calls: 58,
    durationMinutes: 176,
    durationFormatted: '2h 56m',
    sales: 740000,
    salesFormatted: '₹ 7,40,000',
    callsDetail: {
      allCalls: 58,
      distinctRepsCount: 1,
      incoming: 16,
      outgoing: 42,
      missed: 5,
      connected60sPlus: 35,
      attemptedCalls: 58
    },
    tasksDetail: {
      late: 5,
      pending: 16,
      done: 18,
      created: 39
    },
    whatsAppDetail: {
      incoming: 47,
      outgoing: 80,
      deliveryRate: '96.8%'
    }
  },
  {
    rank: 7,
    id: 'u6',
    name: 'Amit Verma',
    role: 'Telesales Rep',
    firstCallTime: '10:05 AM',
    lastCallTime: '06:40 PM',
    calls: 52,
    durationMinutes: 160,
    durationFormatted: '2h 40m',
    sales: 520000,
    salesFormatted: '₹ 5,20,000',
    callsDetail: {
      allCalls: 52,
      distinctRepsCount: 1,
      incoming: 12,
      outgoing: 40,
      missed: 4,
      connected60sPlus: 29,
      attemptedCalls: 52
    },
    tasksDetail: {
      late: 6,
      pending: 8,
      done: 15,
      created: 29
    },
    whatsAppDetail: {
      incoming: 33,
      outgoing: 65,
      deliveryRate: '97.2%'
    }
  },
  {
    rank: 8,
    id: 'u7',
    name: 'Kavita Pillai',
    role: 'WhatsApp Inbound Specialist',
    firstCallTime: '09:30 AM',
    lastCallTime: '06:35 PM',
    calls: 49,
    durationMinutes: 144,
    durationFormatted: '2h 24m',
    sales: 490000,
    salesFormatted: '₹ 4,90,000',
    callsDetail: {
      allCalls: 49,
      distinctRepsCount: 1,
      incoming: 25,
      outgoing: 24,
      missed: 1,
      connected60sPlus: 31,
      attemptedCalls: 49
    },
    tasksDetail: {
      late: 1,
      pending: 15,
      done: 24,
      created: 40
    },
    whatsAppDetail: {
      incoming: 88,
      outgoing: 145,
      deliveryRate: '99.5%'
    }
  }
];

// Aggregated Team Stats for Leaderboard
export const TEAM_TOTAL_STATS = {
  totalCalls: 494,
  distinctRepsCount: 8,
  totalDurationFormatted: '24h 51m',
  totalSalesFormatted: '₹ 86,60,000',
  firstCallTime: '09:05 AM',
  lastCallTime: '07:15 PM',
  incomingCalls: 164,
  outgoingCalls: 330,
  missedCalls: 27,
  connected60sPlus: 311, // distinct from attempted
  attemptedCalls: 494,
  tasks: {
    late: 24,
    pending: 92,
    done: 169,
    created: 285
  },
  whatsApp: {
    incoming: 395,
    outgoing: 712,
    deliveryRate: '98.5%'
  }
};

// ============================================================
// TRUST & COMPLIANCE SEED CONSTANTS
// ============================================================

export const DEFAULT_CALLER_IDENTITY = {
  legalBusinessName: 'Apex Enterprise Solutions India Pvt Ltd',
  displayName: 'Apex Telesales & Advisory',
  registrationNumber: 'U72200MH2021PTC368940',
  logoUrl: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=160&auto=format&fit=crop&q=80',
  businessWebsite: 'https://apexadvisory.example.in',
  registeredAddress: 'Level 8, Tower B, Godrej One, Vikhroli East, Mumbai, MH 400079',
  callingNumbers: [
    {
      id: 'num-1',
      number: '+91 22 6982 4000',
      label: 'Primary National Outbound (Sales & Admissions)',
      status: 'Verified' as const,
      attestationLevel: 'A (Full Attestation)' as const,
      carrier: 'Tata Teleservices / Jio Enterprise',
      cnamRegisteredName: 'Apex Advisory',
      lastAuditDate: '2026-08-25',
      verifiedAnswerRate: 64, // 64% vs 21%
      unverifiedAnswerRate: 21
    },
    {
      id: 'num-2',
      number: '+91 80 4719 3300',
      label: 'South Region Direct Dial (Bangalore Hub)',
      status: 'Verified' as const,
      attestationLevel: 'A (Full Attestation)' as const,
      carrier: 'Bharti Airtel Enterprise SIP',
      cnamRegisteredName: 'Apex Tech Bangalore',
      lastAuditDate: '2026-08-14',
      verifiedAnswerRate: 59,
      unverifiedAnswerRate: 19
    },
    {
      id: 'num-3',
      number: '+91 11 4982 5500',
      label: 'North Region Outreach (Delhi NCR)',
      status: 'Pending' as const,
      attestationLevel: 'B (Partial)' as const,
      carrier: 'Vodafone Idea Business',
      cnamRegisteredName: 'Apex Advisory Delhi',
      lastAuditDate: '2026-09-02',
      verifiedAnswerRate: 41,
      unverifiedAnswerRate: 18
    },
    {
      id: 'num-4',
      number: '+91 20 7119 8840',
      label: 'Special Lending Desk (Pune Line)',
      status: 'Action Required' as const,
      attestationLevel: 'C (Gateway)' as const,
      carrier: 'Airtel Enterprise SIP Trunk',
      cnamRegisteredName: 'Unregistered Carrier DID',
      lastAuditDate: '2026-07-20',
      verifiedAnswerRate: 23,
      unverifiedAnswerRate: 20
    }
  ]
};

export const DEFAULT_CALL_REASONS = [
  {
    id: 'cr-1',
    name: 'Loan application follow-up',
    category: 'Loan Follow-up' as const,
    attachedStage: 'Follow-up',
    campaign: 'SME Working Capital Q3',
    isHighScrutiny: false,
    requiredForDialing: true,
    description: 'Direct consultation on submitted documentation and sanctions.',
    activeCallsCount: 142
  },
  {
    id: 'cr-2',
    name: 'Payment reminder',
    category: 'Payment & Billing' as const,
    attachedStage: 'Payment Pending',
    campaign: 'Automated Invoice Reminders',
    isHighScrutiny: false,
    requiredForDialing: true,
    description: 'Upcoming milestone or token payment reminder before due date.',
    activeCallsCount: 98
  },
  {
    id: 'cr-3',
    name: 'New product offer',
    category: 'Product Demo' as const,
    attachedStage: 'Fresh Lead',
    campaign: 'H2 India Outreach 2026',
    isHighScrutiny: false,
    requiredForDialing: true,
    description: 'Introductory outreach for verified catalog and demo booking.',
    activeCallsCount: 167
  },
  {
    id: 'cr-4',
    name: 'Debt-reduction restructuring',
    category: 'Debt Resolution & Recovery' as const,
    attachedStage: 'Reheated',
    campaign: 'Credit Recovery & Settlement',
    isHighScrutiny: true, // flagged high scrutiny - FTC complaint category up 85%
    requiredForDialing: true,
    description: 'High-scrutiny category: Subject to mandatory call audit, script verification, and explicit consent check.',
    activeCallsCount: 46
  },
  {
    id: 'cr-5',
    name: 'Site visit consultation',
    category: 'General Inquiry' as const,
    attachedStage: '1-to-1 Demo Scheduled',
    campaign: 'Luxury Real Estate Drive',
    isHighScrutiny: false,
    requiredForDialing: true,
    description: 'Confirming transportation and host availability for property walkthrough.',
    activeCallsCount: 78
  },
  {
    id: 'cr-6',
    name: 'Admission fee query',
    category: 'Payment & Billing' as const,
    attachedStage: 'Quotation Shared',
    campaign: 'Executive Education Fall Batch',
    isHighScrutiny: false,
    requiredForDialing: true,
    description: 'Answering queries regarding installment plans and scholarship grants.',
    activeCallsCount: 54
  }
];

export const DEFAULT_FREQUENCY_RULES = {
  callCapMaxAttempts: 3,
  callCapDays: 7,
  whatsAppCapMaxAttempts: 4,
  whatsAppCapDays: 30, // 56% unsubscribe after 4+ messages in 30 days
  smsCapMaxAttempts: 2,
  smsCapDays: 14,
  quietHoursEnabled: true,
  quietHoursStart: '19:00', // 7:00 PM
  quietHoursEnd: '09:00', // 9:00 AM
  enforceTimezone: 'Asia/Kolkata (IST)'
};

export const DEFAULT_CHANNEL_ROUTING_RULES = [
  {
    id: 'crr-1',
    pipelineStageOrCampaign: 'Payment Pending',
    primaryChannel: 'WhatsApp' as const,
    waitPeriodHours: 24,
    fallbackChannel: 'Call' as const,
    triggerCondition: 'No response' as const,
    active: true,
    notes: 'Text preferred over calls for payment nudges (35% vs 29%). Only dial if WhatsApp remains unanswered after 24h.'
  },
  {
    id: 'crr-2',
    pipelineStageOrCampaign: 'Fresh Lead',
    primaryChannel: 'WhatsApp' as const,
    waitPeriodHours: 2,
    fallbackChannel: 'Call' as const,
    triggerCondition: 'No response' as const,
    active: true,
    notes: 'Send verified brochure first. Dial only after lead has viewed catalog or after 2 hours.'
  },
  {
    id: 'crr-3',
    pipelineStageOrCampaign: 'Webinar Scheduled',
    primaryChannel: 'WhatsApp' as const,
    waitPeriodHours: 48,
    fallbackChannel: 'SMS' as const,
    triggerCondition: 'Delivered but unread' as const,
    active: true,
    notes: 'Send calendar invite and venue link. Fallback to SMS if WhatsApp delivery times out.'
  },
  {
    id: 'crr-4',
    pipelineStageOrCampaign: 'Quotation Shared',
    primaryChannel: 'Call' as const,
    waitPeriodHours: 12,
    fallbackChannel: 'WhatsApp' as const,
    triggerCondition: 'Unanswered call' as const,
    active: true,
    notes: 'High complexity pricing discussion: Attempt call first, immediately send recap PDF on WhatsApp if missed.'
  }
];

export const DEFAULT_COMPLIANCE_WATCH = [
  {
    id: 'cw-1',
    categoryName: 'Debt-reduction restructuring',
    volumeCount: 46,
    volumeChangePercent: 85, // FTC FY2024: Debt-reduction rose 85% YoY
    isHighScrutiny: true,
    complaintRiskScore: 'Critical' as const,
    trendPoints: [12, 14, 21, 29, 38, 46],
    lastAuditDate: '2026-09-05',
    flaggedReasons: [
      'Category complaint volume up +85% industry-wide (FTC benchmark)',
      'Requires explicit affirmative audio consent recording',
      'Mandatory display of registered license number in caller card'
    ]
  },
  {
    id: 'cw-2',
    categoryName: 'Urgent Collections & Recovery',
    volumeCount: 22,
    volumeChangePercent: 42,
    isHighScrutiny: true,
    complaintRiskScore: 'High' as const,
    trendPoints: [8, 9, 13, 16, 19, 22],
    lastAuditDate: '2026-09-04',
    flaggedReasons: [
      'Strict 9 AM - 7 PM quiet hour enforcement verified',
      'Maximum 2 contact attempts per 7-day rolling window mandatory'
    ]
  },
  {
    id: 'cw-3',
    categoryName: 'Loan application follow-up',
    volumeCount: 142,
    volumeChangePercent: -4,
    isHighScrutiny: false,
    complaintRiskScore: 'Low' as const,
    trendPoints: [150, 148, 145, 140, 144, 142],
    lastAuditDate: '2026-09-01',
    flaggedReasons: ['Standard commercial compliance - 100% verified numbers']
  },
  {
    id: 'cw-4',
    categoryName: 'Payment reminder',
    volumeCount: 98,
    volumeChangePercent: 6,
    isHighScrutiny: false,
    complaintRiskScore: 'Low' as const,
    trendPoints: [90, 92, 95, 93, 96, 98],
    lastAuditDate: '2026-09-03',
    flaggedReasons: ['Within normal operational thresholds']
  }
];

export const VERIFIED_CALL_STATS = {
  verifiedAnswerRate: 62.4, // Twilio / First Orion research benchmark: 62% vs 20%
  unverifiedAnswerRate: 20.8,
  liftMultiplier: '3.0x',
  totalVerifiedCalls: 382,
  totalUnverifiedCalls: 112,
  blockedAttemptsToday: 38,
  leadsNearCapCount: 26,
  leadsAtCapCount: 14,
  preferenceOptOutCount: 6,
  pausedCount: 8
};

