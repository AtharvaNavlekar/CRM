// security-tests/run-all.ts
// Master Security Test Harness Runner for DialPulse CRM

import { runAuthTests } from './auth.test';
import { runAuthorizationTests } from './authorization.test';
import { runInputValidationTests } from './input-validation.test';
import { runConfigSecretsTests } from './config-secrets.test';
import { runBusinessLogicTests } from './business-logic.test';
import { runRateLimitingTests } from './rate-limiting.test';
import { runComplianceTests } from './compliance.test';
import { BASE_URL, TestResult } from './helpers';

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

async function main() {
  console.log(`\n${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}  DIALPULSE CRM — EXECUTABLE SECURITY TEST HARNESS SUITE             ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}`);
  console.log(`${COLORS.gray}Target Instance: ${BASE_URL}${COLORS.reset}`);
  console.log(`${COLORS.gray}Timestamp: ${new Date().toISOString()}${COLORS.reset}\n`);

  // Verify server reachability
  try {
    const health = await fetch(`${BASE_URL}/api/health`);
    if (!health.ok) {
      console.error(`${COLORS.red}ERROR: Server returned status ${health.status} on /api/health${COLORS.reset}`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`${COLORS.red}ERROR: Cannot connect to server at ${BASE_URL}. Ensure 'npm run dev' is active.${COLORS.reset}`);
    process.exit(1);
  }

  const allResults: TestResult[] = [];

  // 1. Authorization & IDOR (Highest Priority)
  console.log(`${COLORS.bold}${COLORS.magenta}[CATEGORY 1] Authorization, IDOR & Access Control${COLORS.reset}`);
  const authzResults = await runAuthorizationTests();
  printCategoryResults(authzResults);
  allResults.push(...authzResults);

  // 2. Authentication & Session Handling
  console.log(`\n${COLORS.bold}${COLORS.magenta}[CATEGORY 2] Authentication & Session Handling${COLORS.reset}`);
  const authResults = await runAuthTests();
  printCategoryResults(authResults);
  allResults.push(...authResults);

  // 3. Input Validation & Injection
  console.log(`\n${COLORS.bold}${COLORS.magenta}[CATEGORY 3] Input Validation, XSS & Injection Defense${COLORS.reset}`);
  const inputResults = await runInputValidationTests();
  printCategoryResults(inputResults);
  allResults.push(...inputResults);

  // 4. Configuration & Secrets Hardening
  console.log(`\n${COLORS.bold}${COLORS.magenta}[CATEGORY 4] Configuration, CORS & Secrets Hardening${COLORS.reset}`);
  const configResults = await runConfigSecretsTests();
  printCategoryResults(configResults);
  allResults.push(...configResults);

  // 5. Business Logic & Data Integrity
  console.log(`\n${COLORS.bold}${COLORS.magenta}[CATEGORY 5] Business Logic, Concurrency & Data Integrity${COLORS.reset}`);
  const logicResults = await runBusinessLogicTests();
  printCategoryResults(logicResults);
  allResults.push(...logicResults);

  // 6. Rate Limiting & Abuse Prevention
  console.log(`\n${COLORS.bold}${COLORS.magenta}[CATEGORY 6] Rate Limiting & Abuse Prevention${COLORS.reset}`);
  const rateResults = await runRateLimitingTests();
  printCategoryResults(rateResults);
  allResults.push(...rateResults);

  // 7. Outreach Compliance & Telecom Regulations
  console.log(`\n${COLORS.bold}${COLORS.magenta}[CATEGORY 7] Outreach Compliance & Telecom Regulations${COLORS.reset}`);
  const complianceResults = await runComplianceTests();
  printCategoryResults(complianceResults);
  allResults.push(...complianceResults);

  // Print Summary Table
  printSummary(allResults);

  const failedCount = allResults.filter(r => !r.passed).length;
  if (failedCount > 0) {
    console.log(`${COLORS.yellow}${COLORS.bold}Security testing completed: ${failedCount} security exposure(s) detected.${COLORS.reset}\n`);
    // Exit with code 1 if vulnerabilities exist
    process.exit(1);
  } else {
    console.log(`${COLORS.green}${COLORS.bold}All security checks passed! No vulnerabilities detected.${COLORS.reset}\n`);
    process.exit(0);
  }
}

function printCategoryResults(results: TestResult[]) {
  for (const r of results) {
    const statusTag = r.passed
      ? `${COLORS.green}[PASS]${COLORS.reset}`
      : `${COLORS.red}[VULNERABLE - ${r.severity || 'FAIL'}]${COLORS.reset}`;

    console.log(`  ${statusTag} ${COLORS.bold}${r.name}${COLORS.reset} ${COLORS.gray}(${r.executionTimeMs}ms)${COLORS.reset}`);
    console.log(`         ${COLORS.gray}↳ ${r.details}${COLORS.reset}`);
  }
}

function printSummary(results: TestResult[]) {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed);

  const criticals = failed.filter(r => r.severity === 'Critical').length;
  const highs = failed.filter(r => r.severity === 'High').length;
  const mediums = failed.filter(r => r.severity === 'Medium').length;
  const lows = failed.filter(r => r.severity === 'Low').length;

  console.log(`\n${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}  SECURITY TEST HARNESS EXECUTION SUMMARY                             ${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}`);
  console.log(`  Total Test Cases Executed : ${total}`);
  console.log(`  Protected / Passed Checks : ${COLORS.green}${passed}${COLORS.reset}`);
  console.log(`  Identified Vulnerabilities: ${failed.length > 0 ? COLORS.red : COLORS.green}${failed.length}${COLORS.reset}`);
  if (failed.length > 0) {
    console.log(`    • Critical Severity     : ${criticals > 0 ? COLORS.red + COLORS.bold : COLORS.gray}${criticals}${COLORS.reset}`);
    console.log(`    • High Severity         : ${highs > 0 ? COLORS.red : COLORS.gray}${highs}${COLORS.reset}`);
    console.log(`    • Medium Severity       : ${mediums > 0 ? COLORS.yellow : COLORS.gray}${mediums}${COLORS.reset}`);
    console.log(`    • Low Severity          : ${lows > 0 ? COLORS.blue : COLORS.gray}${lows}${COLORS.reset}`);
  }
  console.log(`${COLORS.bold}${COLORS.cyan}======================================================================${COLORS.reset}\n`);
}

main().catch(err => {
  console.error('Test harness execution crashed:', err);
  process.exit(1);
});
