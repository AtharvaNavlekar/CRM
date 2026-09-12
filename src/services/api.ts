import {
  Lead,
  Call,
  Message,
  Ticket,
  User,
  ReportStats,
  AuditLog,
  BackupRecord,
  CustomField,
  RolePermission,
  PipelineStageConfig,
  ContactFrequencyRules,
  Team
} from '../types';

const TOKEN_STORAGE_KEY = 'dialpulse_access_token';
const REFRESH_TOKEN_KEY = 'dialpulse_refresh_token';

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY) || localStorage.getItem('dialpulse_token');
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredTokens(token: string | null, refreshToken?: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      localStorage.setItem(TOKEN_STORAGE_KEY, token); // compatibility
      if (refreshToken) {
        sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem('dialpulse_token');
      localStorage.removeItem('telecrm_token');
      localStorage.removeItem('telecrm_user_id');
    }
  } catch {}
}

export function setStoredToken(token: string | null): void {
  setStoredTokens(token);
}

export class ApiError extends Error {
  status: number;
  data: any;
  code?: string;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.code = data?.code;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, {
    ...options,
    headers
  });

  // If 401 Unauthorized, attempt silent refresh before giving up
  if (response.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/refresh')) {
    const refreshToken = getStoredRefreshToken();

    if (refreshToken && !isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setStoredTokens(data.token, refreshToken);
          isRefreshing = false;
          onRefreshed(data.token);

          // Retry original request
          headers.set('Authorization', `Bearer ${data.token}`);
          response = await fetch(url, { ...options, headers });
        } else {
          isRefreshing = false;
          setStoredTokens(null);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dialpulse:unauthorized', { detail: { url } }));
          }
        }
      } catch {
        isRefreshing = false;
        setStoredTokens(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dialpulse:unauthorized', { detail: { url } }));
        }
      }
    } else if (isRefreshing) {
      // Wait for ongoing refresh
      return new Promise<Response>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          try {
            const retryRes = await fetch(url, { ...options, headers });
            resolve(retryRes);
          } catch (err) {
            reject(err);
          }
        });
      });
    } else {
      setStoredTokens(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dialpulse:unauthorized', { detail: { url } }));
      }
    }
  }

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: response.statusText || `Request failed with status ${response.status}` };
    }
    const errorMessage = errorData.error || errorData.message || response.statusText || `Request failed (${response.status})`;
    throw new ApiError(errorMessage, response.status, errorData);
  }

  return response;
}

export const api = {
  // Users & Auth
  async getUsers(): Promise<User[]> {
    const res = await authFetch('/api/users');
    return res.json();
  },

  async login(email: string, password: string): Promise<{ user: User; token: string; refreshToken?: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new ApiError(err.error || 'Login failed', res.status, err);
    }

    const data = await res.json();
    setStoredTokens(data.token, data.refreshToken);
    return data;
  },

  async refreshToken(): Promise<string | null> {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (res.ok) {
      const data = await res.json();
      setStoredTokens(data.token, refreshToken);
      return data.token;
    }
    setStoredTokens(null);
    return null;
  },

  async getCurrentUser(): Promise<{ user: User }> {
    const res = await authFetch('/api/auth/me');
    return res.json();
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = getStoredRefreshToken();
      await authFetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
    } catch {}
    setStoredTokens(null);
  },

  async switchUser(userId: string, role?: string): Promise<{ user: User; token: string; refreshToken?: string }> {
    const res = await authFetch('/api/auth/switch-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role })
    });
    const data = await res.json();
    setStoredTokens(data.token, data.refreshToken);
    return data;
  },

  async createUser(userData: Partial<User> & { password?: string }): Promise<User> {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return res.json();
  },

  async getTeams(): Promise<Team[]> {
    const res = await authFetch('/api/teams');
    return res.json();
  },

  // Leads
  async getLeads(params?: { repId?: string; source?: string; stage?: string; search?: string }): Promise<Lead[]> {
    const query = new URLSearchParams();
    if (params?.repId) query.append('repId', params.repId);
    if (params?.source) query.append('source', params.source);
    if (params?.stage) query.append('stage', params.stage);
    if (params?.search) query.append('search', params.search);

    const res = await authFetch(`/api/leads?${query.toString()}`);
    return res.json();
  },

  async createLead(lead: Partial<Lead>): Promise<Lead> {
    const res = await authFetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead)
    });
    return res.json();
  },

  async updateLead(id: string, updates: Partial<Lead> & { userName?: string; userRole?: string; version?: number; updatedAt?: string; confirmed?: boolean }): Promise<Lead & { requiresApproval?: boolean; message?: string }> {
    const res = await authFetch(`/api/leads/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteLead(id: string, confirmed?: boolean): Promise<{ success?: boolean; id?: string; requiresApproval?: boolean; message?: string }> {
    const res = await authFetch(`/api/leads/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed })
    });
    return res.json();
  },

  async importLeads(leads: Partial<Lead>[]): Promise<{ count: number; importedLeads: Lead[] }> {
    const res = await authFetch('/api/leads/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leads })
    });
    return res.json();
  },

  async bulkUpdateLeads(leadIds: string[], updates: { stage?: string; assignedRepId?: string }): Promise<{ success: boolean; count: number }> {
    const res = await authFetch('/api/leads/bulk-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadIds, ...updates })
    });
    return res.json();
  },

  async exportLeads(format: 'csv' | 'json' = 'csv', confirmed?: boolean): Promise<Blob | Lead[] | { requiresApproval: boolean; message: string }> {
    const res = await authFetch(`/api/leads/export?format=${format}${confirmed ? '&confirmed=true' : ''}`);
    if (res.status === 202) {
      return res.json();
    }
    if (format === 'json') {
      return res.json();
    }
    return res.blob();
  },

  // Calls
  async getCalls(params?: { leadId?: string; repId?: string }): Promise<Call[]> {
    const query = new URLSearchParams();
    if (params?.leadId) query.append('leadId', params.leadId);
    if (params?.repId) query.append('repId', params.repId);

    const res = await authFetch(`/api/calls?${query.toString()}`);
    return res.json();
  },

  async logCall(callData: {
    leadId: string;
    duration: number;
    outcome: string;
    notes?: string;
    callbackReminder?: string | null;
    repId?: string;
    repName?: string;
    userName?: string;
    userRole?: string;
  }): Promise<{ call: Call; lead: Lead }> {
    const res = await authFetch('/api/calls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callData)
    });
    return res.json();
  },

  // Messages
  async getMessages(leadId?: string): Promise<Message[]> {
    const query = leadId ? `?leadId=${encodeURIComponent(leadId)}` : '';
    const res = await authFetch(`/api/messages${query}`);
    return res.json();
  },

  async sendMessage(leadId: string, text: string, direction: 'inbound' | 'outbound' = 'outbound'): Promise<Message> {
    const res = await authFetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, text, direction })
    });
    return res.json();
  },

  async simulateIncomingReply(leadId: string, customText?: string): Promise<Message> {
    const res = await authFetch('/api/messages/simulate-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, customText })
    });
    return res.json();
  },

  async simulateLeadReply(leadId: string, customText?: string): Promise<Message> {
    return this.simulateIncomingReply(leadId, customText);
  },

  // Compliance
  async getComplianceRules(): Promise<ContactFrequencyRules> {
    const res = await authFetch('/api/compliance/rules');
    return res.json();
  },

  async updateComplianceRules(rules: Partial<ContactFrequencyRules>): Promise<{ success: boolean; rules: ContactFrequencyRules }> {
    const res = await authFetch('/api/compliance/rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules)
    });
    return res.json();
  },

  async checkCompliance(leadId: string, channel: 'Call' | 'WhatsApp' | 'SMS' = 'Call'): Promise<{
    allowed: boolean;
    reason?: string;
    code?: string;
    details?: string;
    currentCount?: number;
    maxAllowed?: number;
  }> {
    const res = await authFetch(`/api/compliance/check?leadId=${encodeURIComponent(leadId)}&channel=${channel}`);
    return res.json();
  },

  // Tickets
  async getTickets(): Promise<Ticket[]> {
    const res = await authFetch('/api/tickets');
    return res.json();
  },

  async createTicket(ticketData: {
    subject: string;
    priority: string;
    leadId?: string;
    initialMessage?: string;
    assignedRepId?: string;
    userName?: string;
    userRole?: string;
  }): Promise<Ticket> {
    const res = await authFetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    });
    return res.json();
  },

  async replyTicket(
    ticketId: string,
    replyData: string | { text: string; updateStatus?: string; sender?: string; senderRole?: string },
    updateStatus?: string,
    userName?: string,
    userRole?: string
  ): Promise<Ticket> {
    const text = typeof replyData === 'string' ? replyData : replyData.text;
    const status = typeof replyData === 'object' ? (replyData.updateStatus || updateStatus) : updateStatus;
    const res = await authFetch(`/api/tickets/${ticketId}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, updateStatus: status, userName, userRole })
    });
    return res.json();
  },

  async updateTicket(ticketId: string, updates: { status?: string; priority?: string; assignedRepId?: string }): Promise<Ticket> {
    const res = await authFetch(`/api/tickets/${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  // Reports
  async getReports(): Promise<ReportStats> {
    const res = await authFetch('/api/reports');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await authFetch('/api/audit-logs');
    return res.json();
  },

  // Backups
  async getBackups(): Promise<BackupRecord[]> {
    const res = await authFetch('/api/backups');
    return res.json();
  },

  async createBackup(name?: string, userName?: string, userRole?: string): Promise<BackupRecord> {
    const res = await authFetch('/api/backups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, userName, userRole })
    });
    return res.json();
  },

  async restoreBackup(backupId: string, userName?: string, userRole?: string): Promise<{ success: boolean; message: string }> {
    const res = await authFetch(`/api/backups/${backupId}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, userRole })
    });
    return res.json();
  },

  // Reset Data
  async resetData(userName?: string, userRole?: string): Promise<{ success: boolean; message: string }> {
    const res = await authFetch('/api/reset-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, userRole })
    });
    return res.json();
  },

  // Message Queue & Health
  async getMessageHealth(): Promise<{
    totalOutbound: number;
    delivered: number;
    queued: number;
    retrying: number;
    failed: number;
    deliveryRate: number;
  }> {
    const res = await authFetch('/api/messages/health');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<{
    customFields: CustomField[];
    rolePermissions: RolePermission[];
    pipelineStages: PipelineStageConfig[];
    autoAssignmentEnabled: boolean;
  }> {
    const res = await authFetch('/api/settings');
    return res.json();
  },

  async updateCustomFields(customFields: CustomField[]): Promise<{ success: boolean; customFields: CustomField[] }> {
    const res = await authFetch('/api/settings/fields', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customFields })
    });
    return res.json();
  },

  async updateRolePermissions(rolePermissions: RolePermission[]): Promise<{ success: boolean; rolePermissions: RolePermission[] }> {
    const res = await authFetch('/api/settings/roles', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rolePermissions })
    });
    return res.json();
  },

  async updatePipelineStages(pipelineStages: PipelineStageConfig[]): Promise<{ success: boolean; pipelineStages: PipelineStageConfig[] }> {
    const res = await authFetch('/api/settings/pipeline', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipelineStages })
    });
    return res.json();
  },

  async toggleAutoAssignment(enabled: boolean): Promise<{ success: boolean; autoAssignmentEnabled: boolean }> {
    const res = await authFetch('/api/settings/auto-assignment', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    return res.json();
  }
};
