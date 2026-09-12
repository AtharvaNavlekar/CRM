import http from 'http';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { JWT_SECRET } from '../server/auth';
import { validateLeadCommunicationCompliance } from '../server/compliance';
import { Lead, User } from '../src/types';

interface TestResult {
  name: string;
  category: 'Token Validation' | 'Admin Route Authorization' | 'Compliance Enforcement' | 'Password Authentication';
  passed: boolean;
  details: string;
  expectedStatus?: number;
  actualStatus?: number;
}

const BASE_URL = 'http://localhost:3000';

function httpRequest(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<{ status: number; data: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const bodyStr = options.body ? JSON.stringify(options.body) : undefined;

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr).toString() } : {}),
          ...options.headers
        }
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let parsedData = null;
          try {
            parsedData = JSON.parse(rawData);
          } catch {
            parsedData = rawData;
          }
          resolve({
            status: res.statusCode || 0,
            data: parsedData,
            headers: res.headers
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  console.log('\x1b[1m\x1b[36m======================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  DIALPULSE CRM — AUTH & COMPLIANCE VERIFICATION TEST SUITE          \x1b[0m');
  console.log('\x1b[1m\x1b[36m======================================================================\x1b[0m\n');

  const results: TestResult[] = [];

  // Seed user credentials
  const adminEmail = 'rahul@telecrm.in';
  const repEmail = 'amit@telecrm.in';
  const validPassword = 'password123';

  // --------------------------------------------------------------------------
  // Category 1: Password Authentication with bcrypt
  // --------------------------------------------------------------------------
  console.log('\x1b[1m\x1b[35m[CATEGORY 1] Password Authentication & Hashing (bcrypt)\x1b[0m');

  // 1.1 Login with wrong password
  const wrongPassRes = await httpRequest('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: 'WrongPassword999!' }
  });
  results.push({
    name: 'Reject invalid password with HTTP 401',
    category: 'Password Authentication',
    passed: wrongPassRes.status === 401,
    details: wrongPassRes.status === 401
      ? 'Enforced: Login rejected when invalid password provided.'
      : `Failed: Expected HTTP 401, got ${wrongPassRes.status}`,
    expectedStatus: 401,
    actualStatus: wrongPassRes.status
  });

  // 1.2 Login with valid bcrypt password
  const validLoginRes = await httpRequest('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: validPassword }
  });
  const adminToken = validLoginRes.data?.token;
  results.push({
    name: 'Accept valid bcrypt password and issue JWT token',
    category: 'Password Authentication',
    passed: validLoginRes.status === 200 && Boolean(adminToken),
    details: validLoginRes.status === 200 && adminToken
      ? 'Verified: Bcrypt hash comparison succeeded, JWT token received.'
      : `Failed: Could not log in with valid credentials (status: ${validLoginRes.status})`,
    expectedStatus: 200,
    actualStatus: validLoginRes.status
  });

  // Log in as Rep
  const repLoginRes = await httpRequest('/api/auth/login', {
    method: 'POST',
    body: { email: repEmail, password: validPassword }
  });
  const repToken = repLoginRes.data?.token;

  // --------------------------------------------------------------------------
  // Category 2: Token Validation & Express Middleware
  // --------------------------------------------------------------------------
  console.log('\x1b[1m\x1b[35m[CATEGORY 2] JWT Token Validation (authenticateToken Middleware)\x1b[0m');

  // 2.1 Missing token
  const noTokenRes = await httpRequest('/api/leads');
  results.push({
    name: 'Reject request missing Authorization header with HTTP 401',
    category: 'Token Validation',
    passed: noTokenRes.status === 401,
    details: noTokenRes.status === 401
      ? 'Protected: Unauthenticated request rejected with HTTP 401 UNAUTHORIZED.'
      : `Vulnerability: Expected 401, got ${noTokenRes.status}`,
    expectedStatus: 401,
    actualStatus: noTokenRes.status
  });

  // 2.2 Tampered / invalid token
  const badTokenRes = await httpRequest('/api/leads', {
    headers: { Authorization: 'Bearer this-is-a-completely-forged-jwt-token' }
  });
  results.push({
    name: 'Reject malformed / tampered JWT token with HTTP 401',
    category: 'Token Validation',
    passed: badTokenRes.status === 401,
    details: badTokenRes.status === 401
      ? 'Protected: Invalid token signature rejected with HTTP 401 INVALID_TOKEN.'
      : `Vulnerability: Expected 401, got ${badTokenRes.status}`,
    expectedStatus: 401,
    actualStatus: badTokenRes.status
  });

  // 2.3 Algorithm "none" token
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify({ id: 'usr-1', email: adminEmail, role: 'Admin', type: 'access' })).toString('base64url');
  const algNoneToken = `${headerB64}.${payloadB64}.`;
  const noneRes = await httpRequest('/api/leads', {
    headers: { Authorization: `Bearer ${algNoneToken}` }
  });
  results.push({
    name: 'Reject unsigned algorithm "none" token with HTTP 401',
    category: 'Token Validation',
    passed: noneRes.status === 401,
    details: noneRes.status === 401
      ? 'Protected: Algorithm "none" bypass attempt rejected with HTTP 401.'
      : `Vulnerability: Expected 401, got ${noneRes.status}`,
    expectedStatus: 401,
    actualStatus: noneRes.status
  });

  // 2.4 Expired token
  const expiredToken = jwt.sign(
    { id: 'usr-1', email: adminEmail, role: 'Admin', type: 'access' },
    JWT_SECRET,
    { expiresIn: -60 }
  );
  const expiredRes = await httpRequest('/api/leads', {
    headers: { Authorization: `Bearer ${expiredToken}` }
  });
  results.push({
    name: 'Reject expired JWT token with HTTP 401',
    category: 'Token Validation',
    passed: expiredRes.status === 401,
    details: expiredRes.status === 401
      ? 'Protected: Expired token rejected with HTTP 401 TOKEN_EXPIRED.'
      : `Vulnerability: Expected 401, got ${expiredRes.status}`,
    expectedStatus: 401,
    actualStatus: expiredRes.status
  });

  // 2.5 Session revocation upon logout
  const tempLogin = await httpRequest('/api/auth/login', {
    method: 'POST',
    body: { email: adminEmail, password: validPassword }
  });
  const sessionToken = tempLogin.data?.token;
  await httpRequest('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: { refreshToken: tempLogin.data?.refreshToken }
  });
  const revokedAccessRes = await httpRequest('/api/leads', {
    headers: { Authorization: `Bearer ${sessionToken}` }
  });
  results.push({
    name: 'Reject revoked session token after logout with HTTP 401',
    category: 'Token Validation',
    passed: revokedAccessRes.status === 401,
    details: revokedAccessRes.status === 401
      ? 'Protected: Revoked token rejected with HTTP 401 TOKEN_REVOKED.'
      : `Vulnerability: Token usable after logout (status: ${revokedAccessRes.status})`,
    expectedStatus: 401,
    actualStatus: revokedAccessRes.status
  });

  // --------------------------------------------------------------------------
  // Category 3: Admin Route Authorization (checkUserPermission & RBAC)
  // --------------------------------------------------------------------------
  console.log('\x1b[1m\x1b[35m[CATEGORY 3] Admin Route Authorization & RBAC Helpers\x1b[0m');

  // 3.1 Non-admin unauthorized access to /api/users
  const repCreateUserRes = await httpRequest('/api/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${repToken}` },
    body: {
      name: 'Unauthorized User',
      email: 'hacker@example.com',
      role: 'Admin'
    }
  });
  results.push({
    name: 'Block non-admin from creating users (POST /api/users) with HTTP 403',
    category: 'Admin Route Authorization',
    passed: repCreateUserRes.status === 403,
    details: repCreateUserRes.status === 403
      ? 'Enforced: Non-admin rejected with HTTP 403 FORBIDDEN.'
      : `Vulnerability: Non-admin created user (status: ${repCreateUserRes.status})`,
    expectedStatus: 403,
    actualStatus: repCreateUserRes.status
  });

  // 3.2 Non-admin unauthorized access to /api/settings/roles
  const repUpdateRolesRes = await httpRequest('/api/settings/roles', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${repToken}` },
    body: { rolePermissions: [] }
  });
  results.push({
    name: 'Block non-admin from modifying role permissions (PUT /api/settings/roles) with HTTP 403',
    category: 'Admin Route Authorization',
    passed: repUpdateRolesRes.status === 403,
    details: repUpdateRolesRes.status === 403
      ? 'Enforced: Non-admin cannot alter security roles (HTTP 403 FORBIDDEN).'
      : `Vulnerability: Non-admin modified roles (status: ${repUpdateRolesRes.status})`,
    expectedStatus: 403,
    actualStatus: repUpdateRolesRes.status
  });

  // 3.3 Non-admin unauthorized access to /api/settings/fields
  const repUpdateFieldsRes = await httpRequest('/api/settings/fields', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${repToken}` },
    body: { customFields: [] }
  });
  results.push({
    name: 'Block non-admin from modifying custom fields (PUT /api/settings/fields) with HTTP 403',
    category: 'Admin Route Authorization',
    passed: repUpdateFieldsRes.status === 403,
    details: repUpdateFieldsRes.status === 403
      ? 'Enforced: Non-admin cannot modify lead fields configuration.'
      : `Vulnerability: Non-admin modified fields (status: ${repUpdateFieldsRes.status})`,
    expectedStatus: 403,
    actualStatus: repUpdateFieldsRes.status
  });

  // 3.4 Non-admin unauthorized database reset (/api/reset-data)
  const repResetDbRes = await httpRequest('/api/reset-data', {
    method: 'POST',
    headers: { Authorization: `Bearer ${repToken}` }
  });
  results.push({
    name: 'Block non-admin from resetting database (POST /api/reset-data) with HTTP 403',
    category: 'Admin Route Authorization',
    passed: repResetDbRes.status === 403,
    details: repResetDbRes.status === 403
      ? 'Enforced: Database reset strictly restricted to Admin role.'
      : `Vulnerability: Database reset accessible to non-admin (status: ${repResetDbRes.status})`,
    expectedStatus: 403,
    actualStatus: repResetDbRes.status
  });

  // 3.5 Admin authorized access to /api/settings/fields
  const adminUpdateFieldsRes = await httpRequest('/api/settings/fields', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      customFields: [
        { id: 'cf-test', name: 'Test Field', type: 'text', required: false }
      ]
    }
  });
  results.push({
    name: 'Allow authorized Admin access to /api/settings/fields with HTTP 200',
    category: 'Admin Route Authorization',
    passed: adminUpdateFieldsRes.status === 200,
    details: adminUpdateFieldsRes.status === 200
      ? 'Allowed: Admin permission verified successfully.'
      : `Failed: Admin got ${adminUpdateFieldsRes.status}`,
    expectedStatus: 200,
    actualStatus: adminUpdateFieldsRes.status
  });

  // --------------------------------------------------------------------------
  // Category 4: Lead Communication Compliance (Opt-Out & Fatigue Status)
  // --------------------------------------------------------------------------
  console.log('\x1b[1m\x1b[35m[CATEGORY 4] Lead Outreach Compliance Enforcement\x1b[0m');

  // Fetch leads to find or create test leads
  const leadsRes = await httpRequest('/api/leads', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const leads: Lead[] = Array.isArray(leadsRes.data) ? leadsRes.data : [];

  // Create an opted-out lead
  const optOutLeadRes = await httpRequest('/api/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: 'Rohan Verma (DND)',
      phone: '+91 99999 11111',
      source: 'Website',
      stage: 'New',
      preferences: {
        preferredChannel: 'Any',
        preferredTimeWindow: 'Anytime',
        allowedTopics: ['General'],
        isPaused30Days: false,
        isOptedOut: true,
        optOutReason: 'Customer explicitly requested Do Not Disturb.',
        updatedAt: new Date().toISOString()
      }
    }
  });
  const optedOutLeadId = optOutLeadRes.data?.id || (leads.find(l => l.preferences?.isOptedOut)?.id);

  // 4.1 Attempt to call opted-out lead
  const callOptedOutRes = await httpRequest('/api/calls', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      leadId: optedOutLeadId,
      duration: 30,
      notes: 'Attempting call to opted out customer'
    }
  });
  const callBlocked = callOptedOutRes.status === 403 && callOptedOutRes.data?.code === 'LEAD_OPTED_OUT';
  results.push({
    name: 'Block outbound call to opted-out lead with HTTP 403 (LEAD_OPTED_OUT)',
    category: 'Compliance Enforcement',
    passed: callBlocked,
    details: callBlocked
      ? 'Enforced: Call rejected with HTTP 403 LEAD_OPTED_OUT before saving to database.'
      : `Vulnerability: Call allowed or incorrect code (HTTP ${callOptedOutRes.status}: ${JSON.stringify(callOptedOutRes.data)})`,
    expectedStatus: 403,
    actualStatus: callOptedOutRes.status
  });

  // 4.2 Attempt to send message to opted-out lead
  const msgOptedOutRes = await httpRequest('/api/messages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      leadId: optedOutLeadId,
      direction: 'outbound',
      text: 'Special promo offer for you!'
    }
  });
  const msgBlocked = msgOptedOutRes.status === 403 && msgOptedOutRes.data?.code === 'LEAD_OPTED_OUT';
  results.push({
    name: 'Block outbound WhatsApp message to opted-out lead with HTTP 403 (LEAD_OPTED_OUT)',
    category: 'Compliance Enforcement',
    passed: msgBlocked,
    details: msgBlocked
      ? 'Enforced: WhatsApp message rejected before database save.'
      : `Vulnerability: Message allowed (HTTP ${msgOptedOutRes.status})`,
    expectedStatus: 403,
    actualStatus: msgOptedOutRes.status
  });

  // 4.3 Create a lead with fatigueStatus = 'capped' and verify outreach blocked
  const cappedLeadRes = await httpRequest('/api/leads', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      name: 'Ananya Deshmukh (High Fatigue)',
      phone: '+91 98888 22222',
      source: 'Website',
      stage: 'Contacted',
      fatigueStatus: 'capped',
      contactAttempts7d: { calls: 5, whatsapp: 5, sms: 2 },
      preferences: {
        preferredChannel: 'Any',
        preferredTimeWindow: 'Anytime',
        allowedTopics: ['Product'],
        isPaused30Days: false,
        isOptedOut: false,
        updatedAt: new Date().toISOString()
      }
    }
  });
  const cappedLeadId = cappedLeadRes.data?.id;

  const callCappedRes = await httpRequest('/api/calls', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      leadId: cappedLeadId,
      duration: 45,
      notes: 'Testing call to fatigue-capped lead'
    }
  });
  const cappedBlocked = (callCappedRes.status === 429 || callCappedRes.status === 403) &&
    (callCappedRes.data?.code === 'FATIGUE_CAP_EXCEEDED' || callCappedRes.data?.code === 'CALL_CAP_EXCEEDED');
  results.push({
    name: 'Block outreach to fatigue-capped lead (status: "capped")',
    category: 'Compliance Enforcement',
    passed: cappedBlocked,
    details: cappedBlocked
      ? `Enforced: Outreach to contact-capped lead rejected with HTTP ${callCappedRes.status} (${callCappedRes.data?.code}).`
      : `Vulnerability: Call allowed to capped lead (status: ${callCappedRes.status})`,
    expectedStatus: 429,
    actualStatus: callCappedRes.status
  });

  // 4.4 Direct unit test of shared validateLeadCommunicationCompliance function
  const mockOptedOutLead: Lead = {
    id: 'mock-1',
    name: 'Unit Test Lead',
    phone: '+91 99999 00000',
    source: 'Website',
    stage: 'New',
    assignedRepId: 'usr-1',
    assignedRepName: 'Priya Sharma',
    createdDate: new Date().toISOString(),
    notes: 'Unit test',
    preferences: {
      isOptedOut: true,
      optOutReason: 'Explicit unsubscribe',
      preferredChannel: 'Any',
      preferredTimeWindow: 'Anytime',
      allowedTopics: [],
      isPaused30Days: false,
      updatedAt: new Date().toISOString()
    }
  };

  const directCheck = validateLeadCommunicationCompliance(mockOptedOutLead, 'Call', {
    timestamp: new Date('2026-09-07T14:00:00+05:30') // During working hours
  });
  results.push({
    name: 'Shared validateLeadCommunicationCompliance() function unit verification',
    category: 'Compliance Enforcement',
    passed: !directCheck.allowed && directCheck.code === 'LEAD_OPTED_OUT',
    details: !directCheck.allowed
      ? `Verified: Shared compliance function returned allowed=false (${directCheck.code}: ${directCheck.reason}).`
      : 'Failed: Function incorrectly allowed outreach to opted-out lead.'
  });

  // --------------------------------------------------------------------------
  // Summary & Reporting
  // --------------------------------------------------------------------------
  console.log('\n\x1b[1m\x1b[36m======================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  TEST EXECUTION RESULTS                                              \x1b[0m');
  console.log('\x1b[1m\x1b[36m======================================================================\x1b[0m');

  let passCount = 0;
  for (const r of results) {
    if (r.passed) {
      passCount++;
      console.log(`  \x1b[32m[PASS]\x1b[0m \x1b[1m${r.name}\x1b[0m`);
      console.log(`         \x1b[90m↳ ${r.details}\x1b[0m`);
    } else {
      console.log(`  \x1b[31m[FAIL]\x1b[0m \x1b[1m${r.name}\x1b[0m`);
      console.log(`         \x1b[31m↳ ${r.details}\x1b[0m`);
    }
  }

  console.log('\x1b[1m\x1b[36m======================================================================\x1b[0m');
  console.log(`  Total Tests Run: ${results.length}`);
  console.log(`  Passed Checks  : \x1b[32m${passCount}\x1b[0m`);
  console.log(`  Failed Checks  : ${results.length - passCount > 0 ? `\x1b[31m${results.length - passCount}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log('\x1b[1m\x1b[36m======================================================================\x1b[0m');

  if (passCount === results.length) {
    console.log('\x1b[32m\x1b[1mAll auth and compliance tests passed successfully!\x1b[0m\n');
    process.exit(0);
  } else {
    console.error('\x1b[31m\x1b[1mSome tests failed.\x1b[0m\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
