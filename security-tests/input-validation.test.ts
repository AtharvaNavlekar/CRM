// security-tests/input-validation.test.ts
// Category 3: Input Validation, Injection, Prototype Pollution & CSV Sanitization

import fs from 'fs';
import path from 'path';
import { request, getAuthToken, TestResult } from './helpers';

export async function runInputValidationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const adminToken = await getAuthToken('admin');

  // --------------------------------------------------------------------------
  // TEST 3.1: Body Field Length Fuzzing (Oversized Strings & Null Bytes)
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const oversizedName = 'A'.repeat(500); // Max allowed is 100
      const nullBytePhone = '+919811234567\0<script>';

      const res = await request('/api/leads', {
        method: 'POST',
        token: adminToken,
        body: {
          name: oversizedName,
          phone: nullBytePhone
        }
      });

      const rejected = res.status === 400;
      results.push({
        category: 'Input Validation & Injection',
        name: 'Field Length & Format Boundary Validation (Oversized Strings)',
        passed: rejected,
        severity: 'Medium',
        details: rejected
          ? 'Enforced: Oversized input (500 chars) properly rejected with HTTP 400.'
          : `VULNERABILITY: Oversized lead name accepted without validation (HTTP ${res.status}).`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Input Validation & Injection',
        name: 'Field Length & Format Boundary Validation (Oversized Strings)',
        passed: false,
        severity: 'Medium',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 3.2: Prototype Pollution via JSON payload (`__proto__`, `constructor`)
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // Send crafted JSON payload containing __proto__
      const pollutionPayload = JSON.parse('{"name": "Proto Test", "phone": "+919811234567", "__proto__": {"pollutedKey": "SECURITY_BREACH"}}');

      await request('/api/leads', {
        method: 'POST',
        token: adminToken,
        body: pollutionPayload
      });

      // Check if Object.prototype has been polluted
      const isPolluted = (Object.prototype as any).pollutedKey === 'SECURITY_BREACH';
      if (isPolluted) {
        delete (Object.prototype as any).pollutedKey; // Clean up
      }

      results.push({
        category: 'Input Validation & Injection',
        name: 'Prototype Pollution Vulnerability Test',
        passed: !isPolluted,
        severity: 'Critical',
        details: isPolluted
          ? 'CRITICAL VULNERABILITY: JSON ingestion permitted Object.prototype pollution!'
          : 'Protected: Object.prototype remains clean and unpolluted after payload processing.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Input Validation & Injection',
        name: 'Prototype Pollution Vulnerability Test',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 3.3: CSV / Spreadsheet Formula Injection (CSV Injection / CWE-1236)
  // Payloads starting with =, +, -, @, \t in /api/leads/import
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const formulaPayload = [
        {
          name: '=cmd|\'/C calc\'!A0',
          phone: '+91 98000 11111',
          notes: '@SUM(1+1)*cmd|'
        }
      ];

      const res = await request('/api/leads/import', {
        method: 'POST',
        token: adminToken,
        body: { leads: formulaPayload }
      });

      const importedLeads = res.data?.importedLeads || [];
      const storedLead = importedLeads[0];

      // If stored raw without prepending ' (quote neutralization) or stripping leading formula characters
      const hasUnescapedFormula = storedLead && (storedLead.name.startsWith('=') || storedLead.notes.startsWith('@'));

      results.push({
        category: 'Input Validation & Injection',
        name: 'CSV / Formula Injection (CWE-1236 in /api/leads/import)',
        passed: !hasUnescapedFormula,
        severity: 'High',
        details: hasUnescapedFormula
          ? `VULNERABILITY CONFIRMED: Spreadsheet formula payload "${storedLead.name}" stored raw without formula sanitization. When exported to CSV and opened in Excel, dynamic DDE/formula execution can occur.`
          : 'Protected: Formula characters sanitized/neutralized during import.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Input Validation & Injection',
        name: 'CSV / Formula Injection (CWE-1236 in /api/leads/import)',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 3.4: Stored XSS & Frontend Rendering Security Audit
  // Verify that React components do not use dangerouslySetInnerHTML
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // Recursively scan src/ for dangerouslySetInnerHTML
      function scanDir(dir: string): string[] {
        let findings: string[] = [];
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            findings = findings.concat(scanDir(fullPath));
          } else if (/\.(tsx|jsx|ts|js)$/.test(file)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes('dangerouslySetInnerHTML')) {
              findings.push(fullPath);
            }
          }
        }
        return findings;
      }

      const xssSinks = scanDir(path.join(process.cwd(), 'src'));
      const passed = xssSinks.length === 0;

      results.push({
        category: 'Input Validation & Injection',
        name: 'XSS Sinks Audit (dangerouslySetInnerHTML in src/)',
        passed,
        severity: 'High',
        details: passed
          ? 'Secure: Zero instances of dangerouslySetInnerHTML found in src/. React automatic text escaping is preserved.'
          : `VULNERABILITY: Raw HTML rendering sink found in: ${xssSinks.join(', ')}`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Input Validation & Injection',
        name: 'XSS Sinks Audit (dangerouslySetInnerHTML in src/)',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  return results;
}
