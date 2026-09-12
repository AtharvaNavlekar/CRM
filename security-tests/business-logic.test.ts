// security-tests/business-logic.test.ts
// Category 5: Business Logic, Concurrency & Data Integrity Tests

import { request, getAuthToken, TestResult, TEST_USERS } from './helpers';

export async function runBusinessLogicTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const adminToken = await getAuthToken('admin', true);
  const repToken = await getAuthToken('rep1', true);

  // --------------------------------------------------------------------------
  // TEST 5.1: Default Password Vulnerability on Admin-Created Users
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const randomId = Math.floor(Math.random() * 10000);
      const testEmail = `invited_user_${randomId}@telecrm.in`;

      // Admin creates user without providing a password
      const createRes = await request('/api/users', {
        method: 'POST',
        token: adminToken,
        body: {
          name: `Invited User ${randomId}`,
          email: testEmail,
          role: 'Rep'
          // Omits password field
        }
      });

      if (createRes.status !== 200) {
        throw new Error(`User creation failed with HTTP ${createRes.status}`);
      }

      // Attacker tests logging in with known default password 'password123'
      const loginAttempt = await request('/api/auth/login', {
        method: 'POST',
        body: {
          email: testEmail,
          password: 'password123'
        }
      });

      const allowedLoginWithDefault = loginAttempt.status === 200 && Boolean(loginAttempt.data?.token);

      results.push({
        category: 'Business Logic & Integrity',
        name: 'Default Hardcoded Password on User Creation (password123)',
        passed: !allowedLoginWithDefault,
        severity: 'High',
        details: allowedLoginWithDefault
          ? `VULNERABILITY CONFIRMED: User created without explicit password defaulted to "password123" and allowed immediate authentication.`
          : 'Protected: Default password login blocked; password setup required.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Business Logic & Integrity',
        name: 'Default Hardcoded Password on User Creation (password123)',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5.2: Optimistic Concurrency Control Bypass (Omitted version/updatedAt)
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const leadsRes = await request('/api/leads', { token: adminToken });
      const lead = (leadsRes.data as any[])[0];

      if (!lead) {
        throw new Error('No lead found to test concurrency');
      }

      const initialVersion = lead.version || 1;

      // Update lead WITHOUT including `version` or `updatedAt` in the payload
      const updateWithoutVersionRes = await request(`/api/leads/${lead.id}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          notes: `Concurrency test without version ${Date.now()}`
          // Omits version and updatedAt!
        }
      });

      // If this succeeds with 200, the optimistic lock is bypassed simply by omitting the fields
      const isBypassed = updateWithoutVersionRes.status === 200;

      results.push({
        category: 'Business Logic & Integrity',
        name: 'Optimistic Concurrency Bypass via Version Omission',
        passed: !isBypassed,
        severity: 'Medium',
        details: isBypassed
          ? `WEAKNESS CONFIRMED: PUT /api/leads/:id accepted updates without requiring "version", bypassing optimistic concurrency checks and allowing silent overwrite of conflicting edits.`
          : 'Protected: Version or updatedAt check strictly enforced on lead updates.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Business Logic & Integrity',
        name: 'Optimistic Concurrency Bypass via Version Omission',
        passed: false,
        severity: 'Medium',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5.3: Database Wipe & Reset Route Authorization
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // Rep attempts to wipe/reset database
      const resetRes = await request('/api/reset-data', {
        method: 'POST',
        token: repToken
      });

      const blocked = resetRes.status === 403;

      results.push({
        category: 'Business Logic & Integrity',
        name: 'Unauthorized Database Reset Protection (/api/reset-data)',
        passed: blocked,
        severity: 'Critical',
        details: blocked
          ? 'Secure: Non-admin database reset attempt was rejected with HTTP 403.'
          : `CRITICAL VULNERABILITY: Non-admin permitted to invoke database reset (HTTP ${resetRes.status}).`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Business Logic & Integrity',
        name: 'Unauthorized Database Reset Protection (/api/reset-data)',
        passed: false,
        severity: 'Critical',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  return results;
}
