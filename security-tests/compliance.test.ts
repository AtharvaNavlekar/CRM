// security-tests/compliance.test.ts
// Category 7: Outreach Compliance & Telecom Regulations (TRAI / Quiet Hours / Opt-Outs)

import { request, getAuthToken, TestResult } from './helpers';

export async function runComplianceTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const adminToken = await getAuthToken('admin');
  const repToken = await getAuthToken('rep1');

  // --------------------------------------------------------------------------
  // TEST 7.1: Global Opt-Out Enforcement on Outbound Calls & WhatsApp
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // 1. Create a lead with opt-out enabled
      const optedOutLeadRes = await request('/api/leads', {
        method: 'POST',
        token: adminToken,
        body: {
          name: 'Opted Out Customer',
          phone: '+91 98999 12345',
          notes: 'Customer explicitly requested DND'
        }
      });

      const leadId = optedOutLeadRes.data.id;

      // Update lead with isOptedOut: true
      await request(`/api/leads/${leadId}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          version: optedOutLeadRes.data.version || 1,
          preferences: {
            isOptedOut: true
          }
        }
      });

      // Attempt to initiate outbound call
      const callRes = await request('/api/calls', {
        method: 'POST',
        token: adminToken,
        body: {
          leadId,
          duration: 30,
          outcome: 'Follow-up'
        }
      });

      // Attempt to send outbound message
      const msgRes = await request('/api/messages', {
        method: 'POST',
        token: adminToken,
        body: {
          leadId,
          text: 'Hello from DialPulse sales',
          direction: 'outbound'
        }
      });

      const callBlocked = callRes.status === 403 && callRes.data?.code === 'LEAD_OPTED_OUT';
      const msgBlocked = msgRes.status === 403 && msgRes.data?.code === 'LEAD_OPTED_OUT';
      const passed = callBlocked && msgBlocked;

      results.push({
        category: 'Outreach Compliance',
        name: 'DND & Global Opt-Out Guard (Calls & Messages Blocked)',
        passed,
        severity: 'Critical',
        details: passed
          ? 'Enforced: Outbound communications to opted-out contacts strictly blocked with HTTP 403 (LEAD_OPTED_OUT).'
          : `VULNERABILITY: Opt-out bypass! Call HTTP ${callRes.status} (${callRes.data?.code}), Message HTTP ${msgRes.status} (${msgRes.data?.code})`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Outreach Compliance',
        name: 'DND & Global Opt-Out Guard (Calls & Messages Blocked)',
        passed: false,
        severity: 'Critical',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 7.2: Blocked Contact Enforcement
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const blockedLeadRes = await request('/api/leads', {
        method: 'POST',
        token: adminToken,
        body: {
          name: 'Abusive Contact',
          phone: '+91 98777 54321',
          notes: 'Customer flagged for abuse'
        }
      });

      const leadId = blockedLeadRes.data.id;

      await request(`/api/leads/${leadId}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          version: blockedLeadRes.data.version || 1,
          preferences: {
            blockedReason: 'Abusive language towards sales rep'
          }
        }
      });

      const callRes = await request('/api/calls', {
        method: 'POST',
        token: adminToken,
        body: {
          leadId,
          duration: 15,
          outcome: 'Follow-up'
        }
      });

      const blocked = callRes.status === 403 && callRes.data?.code === 'LEAD_BLOCKED';

      results.push({
        category: 'Outreach Compliance',
        name: 'Blocked Contact Outreach Guard',
        passed: blocked,
        severity: 'High',
        details: blocked
          ? 'Enforced: Blocked lead outreach rejected with HTTP 403 (LEAD_BLOCKED).'
          : `VULNERABILITY: Blocked lead call allowed (HTTP ${callRes.status}).`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Outreach Compliance',
        name: 'Blocked Contact Outreach Guard',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 7.3: Preferred Channel Restriction Guard
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const waOnlyLeadRes = await request('/api/leads', {
        method: 'POST',
        token: adminToken,
        body: {
          name: 'WhatsApp Only Customer',
          phone: '+91 98222 33445',
          notes: 'Customer prefers WhatsApp only'
        }
      });

      const leadId = waOnlyLeadRes.data.id;

      await request(`/api/leads/${leadId}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          version: waOnlyLeadRes.data.version || 1,
          preferences: {
            preferredChannel: 'WhatsApp'
          }
        }
      });

      // Call should be blocked
      const callRes = await request('/api/calls', {
        method: 'POST',
        token: adminToken,
        body: {
          leadId,
          duration: 30,
          outcome: 'Follow-up'
        }
      });

      const callBlocked = callRes.status === 403 && callRes.data?.code === 'CHANNEL_RESTRICTED';

      results.push({
        category: 'Outreach Compliance',
        name: 'Channel Preference Enforcement (WhatsApp vs Phone Call)',
        passed: callBlocked,
        severity: 'Medium',
        details: callBlocked
          ? 'Enforced: Phone call blocked when lead specifies WhatsApp-only preference (HTTP 403 CHANNEL_RESTRICTED).'
          : `VULNERABILITY: Preference ignored (HTTP ${callRes.status}).`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Outreach Compliance',
        name: 'Channel Preference Enforcement (WhatsApp vs Phone Call)',
        passed: false,
        severity: 'Medium',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 7.4: RBAC on Compliance Frequency Rules Configuration
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // Rep attempts to modify compliance frequency rules
      const repPutRes = await request('/api/compliance/rules', {
        method: 'PUT',
        token: repToken,
        body: { maxCallsPerDay: 50 }
      });

      // Admin modifies compliance frequency rules
      const adminPutRes = await request('/api/compliance/rules', {
        method: 'PUT',
        token: adminToken,
        body: { maxCallsPerDay: 5 }
      });

      const repDenied = repPutRes.status === 403;
      const adminAllowed = adminPutRes.status === 200;
      const passed = repDenied && adminAllowed;

      results.push({
        category: 'Outreach Compliance',
        name: 'Compliance Rules RBAC Protection (/api/compliance/rules)',
        passed,
        severity: 'High',
        details: passed
          ? 'Enforced: Rep modification rejected with HTTP 403; Admin update allowed with HTTP 200.'
          : `VULNERABILITY: Rep allowed (HTTP ${repPutRes.status}) or Admin blocked (HTTP ${adminPutRes.status}).`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Outreach Compliance',
        name: 'Compliance Rules RBAC Protection (/api/compliance/rules)',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  return results;
}
