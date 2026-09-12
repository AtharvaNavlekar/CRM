// security-tests/auth.test.ts
// Category 1: Authentication & Session Handling Tests

import jwt from 'jsonwebtoken';
import { request, getAuthToken, TestResult, TEST_USERS, BASE_URL } from './helpers';

export async function runAuthTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // --------------------------------------------------------------------------
  // TEST 1.1: Brute-Force Rate Limiting on POST /api/auth/login
  // Verify that loginLimiter triggers at the threshold (30 attempts)
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      let triggered429 = false;
      let triggerIndex = -1;
      // Send 33 rapid requests from a single test IP
      const testIp = '198.51.100.99';

      for (let i = 1; i <= 35; i++) {
        const res = await request('/api/auth/login', {
          method: 'POST',
          headers: { 'X-Forwarded-For': testIp },
          body: {
            email: 'nonexistent-victim@telecrm.in',
            password: `wrong-password-${i}`
          }
        });

        if (res.status === 429) {
          triggered429 = true;
          triggerIndex = i;
          break;
        }
      }

      results.push({
        category: 'Authentication & Session',
        name: 'Login Rate Limiting (loginLimiter Threshold Enforcement)',
        passed: triggered429,
        severity: 'Medium',
        details: triggered429
          ? `Enforced: Rate limiter triggered 429 Too Many Requests after ${triggerIndex} attempts.`
          : 'VULNERABILITY: 35 consecutive failed login attempts completed without rate limit enforcement (no 429).',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authentication & Session',
        name: 'Login Rate Limiting (loginLimiter Threshold Enforcement)',
        passed: false,
        severity: 'Medium',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1.2: JWT None Algorithm & Unsigned Token Tampering
  // Confirm that algorithm "none" and unsigned tokens are rejected (HTTP 401)
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // alg: "none", role: "Admin"
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          id: TEST_USERS.rep1.id,
          name: TEST_USERS.rep1.name,
          email: TEST_USERS.rep1.email,
          role: 'Admin',
          exp: Math.floor(Date.now() / 1000) + 3600
        })
      ).toString('base64url');
      const unsignedToken = `${header}.${payload}.`;

      const res = await request('/api/settings', {
        headers: { Authorization: `Bearer ${unsignedToken}` }
      });

      const rejected = res.status === 401;
      results.push({
        category: 'Authentication & Session',
        name: 'JWT Tampering: Unsigned / Algorithm "none" Token Rejection',
        passed: rejected,
        severity: 'Critical',
        details: rejected
          ? 'Secure: Token with alg="none" was properly rejected with HTTP 401.'
          : `VULNERABILITY: Tampered unsigned token accepted with HTTP ${res.status}.`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authentication & Session',
        name: 'JWT Tampering: Unsigned / Algorithm "none" Token Rejection',
        passed: false,
        severity: 'Critical',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1.3: Expired Token Rejection
  // Confirm that expired tokens return 401 Unauthorized
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // Create token expired 1 hour ago (signed with dummy key to check timestamp check or server verification)
      // We also check an authentic token signed with the actual secret if known, or dummy
      const expiredPayload = {
        id: TEST_USERS.rep1.id,
        name: TEST_USERS.rep1.name,
        email: TEST_USERS.rep1.email,
        role: TEST_USERS.rep1.role,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };
      const dummySecret = 'test-secret';
      const expiredToken = jwt.sign(expiredPayload, dummySecret);

      const res = await request('/api/settings', {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });

      const rejected = res.status === 401;
      results.push({
        category: 'Authentication & Session',
        name: 'Expired JWT Token Rejection',
        passed: rejected,
        severity: 'Medium',
        details: rejected
          ? 'Secure: Expired/invalid token properly rejected with HTTP 401.'
          : `VULNERABILITY: Expired token accepted with HTTP ${res.status}.`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authentication & Session',
        name: 'Expired JWT Token Rejection',
        passed: false,
        severity: 'Medium',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1.4: Token Invalidation upon POST /api/auth/logout
  // Confirm that logged-out token is blocked from subsequent requests
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // 1. Log in fresh to get a distinct token
      const loginRes = await request('/api/auth/login', {
        method: 'POST',
        body: { email: TEST_USERS.rep1.email, password: TEST_USERS.rep1.password }
      });
      const freshToken = loginRes.data?.token;

      // 2. Call logout with this token
      const logoutRes = await request('/api/auth/logout', {
        method: 'POST',
        token: freshToken
      });

      // 3. Attempt to use the logged-out token
      const postLogoutRes = await request('/api/settings', {
        token: freshToken
      });

      const isInvalidated = postLogoutRes.status === 401;
      results.push({
        category: 'Authentication & Session',
        name: 'Session Revocation on POST /api/auth/logout',
        passed: isInvalidated,
        severity: 'High',
        details: isInvalidated
          ? 'Secure: Token successfully revoked; subsequent requests return HTTP 401.'
          : `VULNERABILITY: Logged-out token still usable on protected endpoints (HTTP ${postLogoutRes.status}).`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authentication & Session',
        name: 'Session Revocation on POST /api/auth/logout',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1.5: Hardcoded JWT_SECRET Fallback Analysis & Forgery Check
  // Inspect whether fallback secret exists in source code and can be forged
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const knownFallbackSecret = 'dialpulse-crm-jwt-secret-key-production-2026';
      const forgedToken = jwt.sign(
        {
          id: TEST_USERS.admin.id,
          name: TEST_USERS.admin.name,
          email: TEST_USERS.admin.email,
          role: 'Admin'
        },
        knownFallbackSecret,
        { expiresIn: '1h' }
      );

      const res = await request('/api/settings', {
        token: forgedToken
      });

      // If res.status is 200, the server is actively using the hardcoded fallback secret!
      const activeFallbackExploited = res.status === 200;

      // Also verify source code statically
      const fs = await import('fs');
      const serverCode = fs.readFileSync('server.ts', 'utf-8');
      const hasHardcodedFallbackInCode = serverCode.includes('dialpulse-crm-jwt-secret-key-production-2026');

      results.push({
        category: 'Authentication & Session',
        name: 'Hardcoded Fallback JWT_SECRET Vulnerability',
        passed: !activeFallbackExploited && !hasHardcodedFallbackInCode,
        severity: 'Critical',
        details: activeFallbackExploited
          ? `CRITICAL VULNERABILITY CONFIRMED: Server actively accepted a forged Admin token signed with the hardcoded fallback secret "${knownFallbackSecret}" (HTTP 200)!`
          : hasHardcodedFallbackInCode
          ? `HIGH RISK: Hardcoded secret fallback string exists in server.ts (line 46). If process.env.JWT_SECRET is unset in production, full authentication bypass occurs.`
          : 'Secure: No hardcoded secret fallback detected.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Authentication & Session',
        name: 'Hardcoded Fallback JWT_SECRET Vulnerability',
        passed: false,
        severity: 'Critical',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  return results;
}
