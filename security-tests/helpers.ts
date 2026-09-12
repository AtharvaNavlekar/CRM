// security-tests/helpers.ts
// Shared utilities and assertions for DialPulse CRM Security Test Harness

export const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

export interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  severity?: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  details: string;
  executionTimeMs: number;
}

export interface UserCredentials {
  email: string;
  password: string;
  role: string;
}

export const TEST_USERS = {
  admin: {
    id: 'usr-1',
    name: 'Rahul Sharma',
    email: 'rahul@telecrm.in',
    password: 'password123',
    role: 'Admin'
  },
  teamLead: {
    id: 'usr-2',
    name: 'Priya Iyer',
    email: 'priya@telecrm.in',
    password: 'password123',
    role: 'Team Lead'
  },
  rep1: {
    id: 'usr-3',
    name: 'Amit Verma',
    email: 'amit@telecrm.in',
    password: 'password123',
    role: 'Rep'
  },
  rep2: {
    id: 'usr-4',
    name: 'Sneha Kulkarni',
    email: 'sneha@telecrm.in',
    password: 'password123',
    role: 'Rep'
  }
};

let cachedTokens: Record<string, string> = {};

export async function getAuthToken(userKey: keyof typeof TEST_USERS, forceFresh = false): Promise<string> {
  if (!forceFresh && cachedTokens[userKey]) {
    return cachedTokens[userKey];
  }
  const user = TEST_USERS[userKey];
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password })
  });

  if (!res.ok) {
    throw new Error(`Failed to authenticate as ${userKey}: HTTP ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  if (!forceFresh) {
    cachedTokens[userKey] = data.token;
  }
  return data.token;
}

export function clearTokenCache() {
  cachedTokens = {};
}

export async function request(
  endpoint: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
) {
  const headers: Record<string, string> = {
    ...options.headers
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    data
  };
}
