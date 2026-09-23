export interface LeaderboardMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  calls: number;
  durationMinutes: number;
  sales: number;
  rank: number;
  callsDetail: {
    allCalls: number;
    incoming: number;
    outgoing: number;
    missed: number;
    connected60sPlus: number;
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
  };
}

export const INITIAL_LEADERBOARD: LeaderboardMember[] = [
  {
    id: 'lb-1',
    name: 'Priya Iyer',
    role: 'Team Lead',
    calls: 68,
    durationMinutes: 245,
    sales: 1250000,
    rank: 1,
    callsDetail: {
      allCalls: 68,
      incoming: 24,
      outgoing: 44,
      missed: 2,
      connected60sPlus: 38,
      attemptedCalls: 70
    },
    tasksDetail: {
      late: 0,
      pending: 4,
      done: 22,
      created: 26
    },
    whatsAppDetail: {
      incoming: 42,
      outgoing: 58
    }
  },
  {
    id: 'lb-2',
    name: 'Aakash Verma',
    role: 'Telesales Specialist',
    calls: 64,
    durationMinutes: 210,
    sales: 980000,
    rank: 2,
    callsDetail: {
      allCalls: 64,
      incoming: 18,
      outgoing: 46,
      missed: 4,
      connected60sPlus: 32,
      attemptedCalls: 68
    },
    tasksDetail: {
      late: 1,
      pending: 5,
      done: 18,
      created: 24
    },
    whatsAppDetail: {
      incoming: 36,
      outgoing: 48
    }
  },
  {
    id: 'lb-3',
    name: 'Sneha Kulkarni',
    role: 'Inside Sales Telecaller',
    calls: 58,
    durationMinutes: 195,
    sales: 840000,
    rank: 3,
    callsDetail: {
      allCalls: 58,
      incoming: 20,
      outgoing: 38,
      missed: 3,
      connected60sPlus: 29,
      attemptedCalls: 61
    },
    tasksDetail: {
      late: 2,
      pending: 3,
      done: 16,
      created: 21
    },
    whatsAppDetail: {
      incoming: 28,
      outgoing: 40
    }
  },
  {
    id: 'lb-4',
    name: 'Amit Verma',
    role: 'Outbound Telecaller',
    calls: 52,
    durationMinutes: 175,
    sales: 620000,
    rank: 4,
    callsDetail: {
      allCalls: 52,
      incoming: 12,
      outgoing: 40,
      missed: 5,
      connected60sPlus: 26,
      attemptedCalls: 57
    },
    tasksDetail: {
      late: 2,
      pending: 6,
      done: 11,
      created: 19
    },
    whatsAppDetail: {
      incoming: 20,
      outgoing: 35
    }
  },
  {
    id: 'lb-5',
    name: 'Arjun Das',
    role: 'Senior Counselor',
    calls: 44,
    durationMinutes: 160,
    sales: 490000,
    rank: 5,
    callsDetail: {
      allCalls: 44,
      incoming: 14,
      outgoing: 30,
      missed: 2,
      connected60sPlus: 24,
      attemptedCalls: 46
    },
    tasksDetail: {
      late: 1,
      pending: 4,
      done: 14,
      created: 19
    },
    whatsAppDetail: {
      incoming: 18,
      outgoing: 26
    }
  },
  {
    id: 'lb-6',
    name: 'Meera Nambisan',
    role: 'Enrollment Specialist',
    calls: 35,
    durationMinutes: 120,
    sales: 380000,
    rank: 6,
    callsDetail: {
      allCalls: 35,
      incoming: 10,
      outgoing: 25,
      missed: 2,
      connected60sPlus: 18,
      attemptedCalls: 37
    },
    tasksDetail: {
      late: 1,
      pending: 2,
      done: 9,
      created: 12
    },
    whatsAppDetail: {
      incoming: 12,
      outgoing: 20
    }
  }
];

export const TEAM_TOTAL_STATS = {
  calls: {
    allCalls: 321,
    incoming: 98,
    outgoing: 223,
    missed: 18,
    connected60sPlus: 167,
    attemptedCalls: 339
  },
  tasks: {
    late: 7,
    pending: 24,
    done: 90,
    created: 121
  },
  whatsApp: {
    incoming: 156,
    outgoing: 227,
    deliveryRate: '98.9%'
  }
};
