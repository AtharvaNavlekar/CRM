// security-tests/config-secrets.test.ts
// Category 4: Configuration, CORS, Helmet & Secrets Leakage Hardening

import fs from 'fs';
import path from 'path';
import { request, TestResult } from './helpers';

export async function runConfigSecretsTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // --------------------------------------------------------------------------
  // TEST 4.1: Permissive CORS Reflection with Credentials
  // origin: true + credentials: true allows any origin to read credentialed responses
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const maliciousOrigin = 'https://attacker-evil-site.com';
      const res = await request('/api/health', {
        headers: {
          Origin: maliciousOrigin
        }
      });

      const allowOrigin = res.headers.get('access-control-allow-origin');
      const allowCredentials = res.headers.get('access-control-allow-credentials');

      const isReflectingArbitraryOriginWithCreds =
        allowOrigin === maliciousOrigin && allowCredentials === 'true';

      results.push({
        category: 'Configuration & Secrets',
        name: 'CORS Origin Reflection with Credentials (Cross-Origin Data Exfiltration)',
        passed: !isReflectingArbitraryOriginWithCreds,
        severity: 'Critical',
        details: isReflectingArbitraryOriginWithCreds
          ? `VULNERABILITY CONFIRMED: Server reflected arbitrary Origin "${maliciousOrigin}" with Access-Control-Allow-Credentials: true. An attacker website can make credentialed background requests to read sensitive CRM customer data.`
          : `Protected: Arbitrary origin not reflected with credentials (Origin: ${allowOrigin}, Credentials: ${allowCredentials}).`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Configuration & Secrets',
        name: 'CORS Origin Reflection with Credentials (Cross-Origin Data Exfiltration)',
        passed: false,
        severity: 'Critical',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4.2: Production Build Leaks Scanner (dist/assets/ Client Bundles)
  // Scans client-shipped JS bundles for server secrets (GEMINI_API_KEY, JWT_SECRET)
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
      let leakedSecrets: string[] = [];

      if (fs.existsSync(distAssetsDir)) {
        const files = fs.readdirSync(distAssetsDir);
        for (const file of files) {
          if (file.endsWith('.js')) {
            const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf-8');
            if (content.includes('GEMINI_API_KEY') || content.includes('AIzaSy')) {
              leakedSecrets.push(`GEMINI_API_KEY pattern in ${file}`);
            }
            if (content.includes('dialpulse-crm-jwt-secret')) {
              leakedSecrets.push(`JWT_SECRET fallback string in ${file}`);
            }
          }
        }
      }

      const passed = leakedSecrets.length === 0;
      results.push({
        category: 'Configuration & Secrets',
        name: 'Client Build Artifact Secrets Leakage (dist/assets Scanner)',
        passed,
        severity: 'Critical',
        details: passed
          ? 'Secure: No server secrets or Gemini API keys found in client-shipped assets (dist/assets/*.js).'
          : `CRITICAL LEAK: Server secrets detected in client assets: ${leakedSecrets.join(', ')}`,
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Configuration & Secrets',
        name: 'Client Build Artifact Secrets Leakage (dist/assets Scanner)',
        passed: false,
        severity: 'Critical',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4.3: Helmet Security Headers & CSP Configuration
  // Check whether CSP and Frameguard are completely disabled
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
      const cspDisabled = serverCode.includes('contentSecurityPolicy: false');
      const frameguardDisabled = serverCode.includes('frameguard: false');

      const isUnsafe = cspDisabled || frameguardDisabled;

      results.push({
        category: 'Configuration & Secrets',
        name: 'Helmet Security Headers & CSP Policy Check',
        passed: !isUnsafe,
        severity: 'Medium',
        details: isUnsafe
          ? `WARNING / WEAKNESS DETECTED: Helmet contentSecurityPolicy (${cspDisabled ? 'disabled' : 'enabled'}) and frameguard (${frameguardDisabled ? 'disabled' : 'enabled'}) are disabled. While necessary in sandboxed iframe previews, production deployments must configure a restrictive CSP policy and anti-clickjacking frame-ancestors restrictions.`
          : 'Secure: Strict CSP and Frameguard configured in Helmet.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Configuration & Secrets',
        name: 'Helmet Security Headers & CSP Policy Check',
        passed: false,
        severity: 'Medium',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4.4: Hardcoded Fallback Secrets Audit across Codebase
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf-8');
      const fallbackMatches: string[] = [];

      // Match patterns like process.env.X || 'string'
      const regex = /process\.env\.([A-Z0-9_]+)\s*\|\|\s*['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = regex.exec(serverCode)) !== null) {
        fallbackMatches.push(`${match[1]} fallback: "${match[2]}"`);
      }

      const hasHardcodedSecret = fallbackMatches.some(m => m.includes('JWT_SECRET') || m.includes('SECRET') || m.includes('KEY'));

      results.push({
        category: 'Configuration & Secrets',
        name: 'Environment Secrets Fallback Code Audit',
        passed: !hasHardcodedSecret,
        severity: 'High',
        details: hasHardcodedSecret
          ? `VULNERABILITY DETECTED: Found hardcoded fallback values for secrets: ${fallbackMatches.join(', ')}. Production should throw a startup error if critical secrets are omitted from the environment.`
          : 'Secure: All environment secrets required without hardcoded defaults.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Configuration & Secrets',
        name: 'Environment Secrets Fallback Code Audit',
        passed: false,
        severity: 'High',
        details: `Test execution failed: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  return results;
}
