// security-tests/authorization.test.ts
// Category 2: Authorization & Access Control (IDOR, RBAC, Privilege Escalation)

import { request, getAuthToken, TestResult, TEST_USERS } from './helpers';

export async function runAuthorizationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const adminToken = await getAuthToken('admin');
  const teamLeadToken = await getAuthToken('teamLead');
  const rep1Token = await getAuthToken('rep1'); // Amit (usr-3)
  const rep2Token = await getAuthToken('rep2'); // Sneha (usr-4)

  // --------------------------------------------------------------------------
  // TEST 2.1: IDOR on PUT /api/leads/:id
  // Rep attempts to modify a lead assigned to another Rep
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // Find a lead assigned to Sneha (usr-4)
      const leadsRes = await request('/api/leads', { token: adminToken });
      const snehaLead = (leadsRes.data as any[]).find(l => l.assignedRepId === TEST_USERS.rep2.id);

      if (!snehaLead) {
        throw new Error('Could not find a lead assigned to Sneha for IDOR testing');
      }

      // Amit (rep1) attempts to update Sneha's lead
      const updateRes = await request(`/api/leads/${snehaLead.id}`, {
        method: 'PUT',
        token: rep1Token,
        body: {
          notes: `[UNAUTHORIZED MODIFICATION BY ${TEST_USERS.rep1.name}]`
        }
      });

      // Secure behavior: Must return 403 Forbidden or 404
      // Vulnerable behavior: Returns 200 OK allowing modification
      const isVulnerable = updateRes.status === 200;
      results.push({
        category: 'Authorization & IDOR',
        name: 'IDOR on PUT /api/leads/:id (Cross-Rep Lead Tampering)',
        passed: !isVulnerable,
        severity: 'Critical',
        details: isVulnerable
          ? `VULNERABILITY CONFIRMED: Rep "${TEST_USERS.rep1.name}" (usr-3) successfully modified lead ${snehaLead.id} assigned to "${TEST_USERS.rep2.name}" (usr-4) with HTTP 200.`
          : `Protected: Cross-rep lead update rejected with HTTP ${updateRes.status}`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authorization & IDOR',
        name: 'IDOR on PUT /api/leads/:id (Cross-Rep Lead Tampering)',
        passed: false,
        severity: 'Critical',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 2.2: IDOR on GET /api/calls
  // Rep accesses another rep's call history
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // Amit (rep1) requests calls of Sneha (rep2)
      const res = await request(`/api/calls?repId=${TEST_USERS.rep2.id}`, {
        token: rep1Token
      });

      const calls = Array.isArray(res.data) ? res.data : [];
      const hasOtherRepCalls = res.status === 200 && calls.length > 0;

      results.push({
        category: 'Authorization & IDOR',
        name: 'IDOR on GET /api/calls?repId (Cross-Rep Call History Exposure)',
        passed: !hasOtherRepCalls,
        severity: 'High',
        details: hasOtherRepCalls
          ? `VULNERABILITY CONFIRMED: Rep "${TEST_USERS.rep1.name}" exposed ${calls.length} private call logs of Rep "${TEST_USERS.rep2.name}" (HTTP 200).`
          : `Protected: Cross-rep call access filtered or restricted with HTTP ${res.status}`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authorization & IDOR',
        name: 'IDOR on GET /api/calls?repId (Cross-Rep Call History Exposure)',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 2.3: Identity Spoofing on POST /api/calls
  // Low-privilege user calls POST /api/calls with spoofed repId / repName
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const leadsRes = await request('/api/leads', { token: adminToken });
      const leadId = (leadsRes.data as any[])[0]?.id || 'lead-101';

      const spoofRes = await request('/api/calls', {
        method: 'POST',
        token: rep1Token, // Authenticated as Amit
        body: {
          leadId,
          duration: 60,
          outcome: 'Follow-up',
          repId: TEST_USERS.admin.id, // Spoofing Admin
          repName: `${TEST_USERS.admin.name} (SPOOFED)`,
          notes: 'Test call spoofing admin identity'
        }
      });

      const returnedRepId = spoofRes.data?.call?.repId;
      const returnedRepName = spoofRes.data?.call?.repName;

      const isSpoofed = returnedRepId === TEST_USERS.admin.id;

      results.push({
        category: 'Authorization & IDOR',
        name: 'Identity Spoofing on POST /api/calls (Arbitrary repId Injection)',
        passed: !isSpoofed,
        severity: 'High',
        details: isSpoofed
          ? `VULNERABILITY CONFIRMED: Rep "${TEST_USERS.rep1.name}" successfully spoofed call attribution to Admin "${returnedRepName}" (${returnedRepId}).`
          : `Protected: Call strictly bound to authenticated caller "${TEST_USERS.rep1.name}".`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authorization & IDOR',
        name: 'Identity Spoofing on POST /api/calls (Arbitrary repId Injection)',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 2.4: Privilege Escalation via POST /api/auth/switch-user
  // Low-privilege Rep requests role escalation or switches to Admin
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const switchRes = await request('/api/auth/switch-user', {
        method: 'POST',
        token: rep1Token,
        body: {
          userId: TEST_USERS.rep1.id,
          role: 'Admin'
        }
      });

      const isEscalated = switchRes.status === 200 && switchRes.data?.user?.role === 'Admin';

      // Crucial: Restore Amit's role back to 'Rep' immediately so state isn't contaminated
      if (isEscalated) {
        await request('/api/auth/switch-user', {
          method: 'POST',
          body: {
            userId: TEST_USERS.rep1.id,
            role: 'Rep'
          }
        });
      }

      results.push({
        category: 'Authorization & IDOR',
        name: 'Privilege Escalation on POST /api/auth/switch-user',
        passed: !isEscalated,
        severity: 'Critical',
        details: isEscalated
          ? `VULNERABILITY CONFIRMED: Rep "${TEST_USERS.rep1.name}" escalated privileges to "Admin" without administrative authorization (HTTP 200).`
          : `Protected: Unauthorized role promotion blocked with HTTP ${switchRes.status}.`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authorization & IDOR',
        name: 'Privilege Escalation on POST /api/auth/switch-user',
        passed: false,
        severity: 'Critical',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 2.5: Systematic RBAC Matrix Enforcement
  // Verify 403 Forbidden is returned for protected routes across all roles
  // --------------------------------------------------------------------------
  // Obtain fresh login token for Rep to ensure clean role
  const freshRepLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: TEST_USERS.rep1.email, password: TEST_USERS.rep1.password }
  });
  const cleanRepToken = freshRepLogin.data?.token || rep1Token;
  const protectedRoutes = [
    {
      name: 'DELETE /api/leads/:id',
      endpoint: '/api/leads/lead-nonexistent-test',
      method: 'DELETE',
      forbiddenRoles: ['Rep'],
      allowedRoles: ['Admin', 'Team Lead']
    },
    {
      name: 'POST /api/leads/import',
      endpoint: '/api/leads/import',
      method: 'POST',
      body: { leads: [{ name: 'Test', phone: '+91 98000 00000' }] },
      forbiddenRoles: ['Rep'],
      allowedRoles: ['Admin', 'Team Lead']
    },
    {
      name: 'POST /api/leads/bulk-update',
      endpoint: '/api/leads/bulk-update',
      method: 'POST',
      body: { leadIds: ['lead-101'], stage: 'Won' },
      forbiddenRoles: ['Rep'],
      allowedRoles: ['Admin', 'Team Lead']
    },
    {
      name: 'POST /api/users (User Invitation)',
      endpoint: '/api/users',
      method: 'POST',
      body: { name: 'RBAC Test', email: 'rbactest@example.com', role: 'Rep' },
      forbiddenRoles: ['Rep', 'Team Lead'],
      allowedRoles: ['Admin']
    },
    {
      name: 'POST /api/reset-data (Database Wipe/Reset)',
      endpoint: '/api/reset-data',
      method: 'POST',
      forbiddenRoles: ['Rep', 'Team Lead'],
      allowedRoles: ['Admin']
    },
    {
      name: 'POST /api/backups/:id/restore',
      endpoint: '/api/backups/fake-id/restore',
      method: 'POST',
      forbiddenRoles: ['Rep', 'Team Lead'],
      allowedRoles: ['Admin']
    },
    {
      name: 'PUT /api/settings/roles',
      endpoint: '/api/settings/roles',
      method: 'PUT',
      body: { rolePermissions: [] },
      forbiddenRoles: ['Rep', 'Team Lead'],
      allowedRoles: ['Admin']
    }
  ];

  for (const route of protectedRoutes) {
    const start = Date.now();
    try {
      let failureDetails: string[] = [];

      // Test forbidden roles (Must get 403)
      for (const role of route.forbiddenRoles) {
        const token = role === 'Rep' ? cleanRepToken : teamLeadToken;
        const res = await request(route.endpoint, {
          method: route.method,
          token,
          body: route.body
        });

        if (res.status !== 403) {
          failureDetails.push(`Role ${role} expected 403 but got ${res.status}`);
        }
      }

      const passed = failureDetails.length === 0;
      results.push({
        category: 'Authorization & IDOR',
        name: `RBAC Guard: ${route.name}`,
        passed,
        severity: 'High',
        details: passed
          ? `Enforced: 403 Forbidden correctly returned for unauthorized roles [${route.forbiddenRoles.join(', ')}].`
          : `VULNERABILITY: ${failureDetails.join('; ')}`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authorization & IDOR',
        name: `RBAC Guard: ${route.name}`,
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  return results;
}
