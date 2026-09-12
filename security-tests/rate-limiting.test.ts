// security-tests/rate-limiting.test.ts
// Category 6: Rate Limiting, IP Spoofing & Abuse Prevention Tests

import { request, getAuthToken, TestResult } from './helpers';

export async function runRateLimitingTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const adminToken = await getAuthToken('admin');

  // --------------------------------------------------------------------------
  // TEST 6.1: Rate Limiter Bypass via Spoofed X-Forwarded-For Header
  // Because "trust proxy" is enabled, check if rotating X-Forwarded-For resets counter
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const fixedIp = '198.51.100.50';

      // 1. Send requests until 429 on fixedIp (or up to 33)
      for (let i = 0; i < 32; i++) {
        await request('/api/auth/login', {
          method: 'POST',
          headers: { 'X-Forwarded-For': fixedIp },
          body: { email: 'wrong@telecrm.in', password: 'wrong' }
        });
      }

      // Check if fixedIp is now blocked
      const blockedRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'X-Forwarded-For': fixedIp },
        body: { email: 'wrong@telecrm.in', password: 'wrong' }
      });

      const isRateLimited = blockedRes.status === 429;

      // Now send request with a spoofed different IP
      const spoofedIp = '198.51.100.51';
      const spoofRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'X-Forwarded-For': spoofedIp },
        body: { email: 'wrong@telecrm.in', password: 'wrong' }
      });

      // If spoofRes.status is 401 instead of 429, attacker bypassed rate limiter by spoofing header
      const bypassSuccessful = isRateLimited && spoofRes.status === 401;

      results.push({
        category: 'Rate Limiting & Abuse',
        name: 'Rate Limiter Spoofing Resistance (X-Forwarded-For Bypass)',
        passed: !bypassSuccessful,
        severity: 'High',
        details: bypassSuccessful
          ? 'VULNERABILITY CONFIRMED: Rotating the client-supplied X-Forwarded-For header resets rate limiting quotas due to trusting arbitrary proxy headers, permitting unhindered credential stuffing.'
          : 'Protected: Rate limiter resistant to X-Forwarded-For header rotation or properly bounded.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Rate Limiting & Abuse',
        name: 'Rate Limiter Spoofing Resistance (X-Forwarded-For Bypass)',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 6.2: Expensive Resource Abuse / Large Batch Input Handling
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // Test sending an oversized batch to /api/leads/import
      const oversizedBatch = Array.from({ length: 500 }, (_, i) => ({
        name: `Oversized Lead ${i}`,
        phone: `+9198112345${String(i).padStart(2, '0')}`,
        notes: 'X'.repeat(500)
      }));

      const res = await request('/api/leads/import', {
        method: 'POST',
        token: adminToken,
        body: { leads: oversizedBatch }
      });

      // If server processes without batch cap or limits
      const isUnbounded = res.status === 200 && res.data?.count === 500;

      results.push({
        category: 'Rate Limiting & Abuse',
        name: 'Unbounded Batch Processing Limit (/api/leads/import)',
        passed: !isUnbounded,
        severity: 'Medium',
        details: isUnbounded
          ? 'WARNING: /api/leads/import accepted 500 records in a single payload without batch-size restrictions. Large batches can cause synchronous event-loop stalls in Node.js.'
          : `Enforced: Batch import capped or rejected with HTTP ${res.status}.`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Rate Limiting & Abuse',
        name: 'Unbounded Batch Processing Limit (/api/leads/import)',
        passed: false,
        severity: 'Medium',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  return results;
}
