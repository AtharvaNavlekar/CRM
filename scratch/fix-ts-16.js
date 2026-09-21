import fs from 'fs';

// 1. Fix server.ts duplicate healthRouter import and 'now'
let serverTs = fs.readFileSync('server.ts', 'utf-8');
const lines = serverTs.split('\n');
const newLines = [];
let healthRouterImportCount = 0;
let inLeadsImport836 = false;
let braceDepth = 0;

for (let i = 0; i < lines.length; i++) {
  let skip = false;
  
  if (lines[i].includes("import { healthRouter } from './server/routes/health';")) {
    healthRouterImportCount++;
    if (healthRouterImportCount > 1) skip = true;
  }
  
  // Remove duplicate leads/import at 836
  if (lines[i].includes("app.post('/api/leads/import', async (req, res) => {") && i < 1000) {
    inLeadsImport836 = true;
    braceDepth = 0;
  }
  
  if (inLeadsImport836) {
    if (lines[i].includes('{')) braceDepth += (lines[i].match(/{/g) || []).length;
    if (lines[i].includes('}')) braceDepth -= (lines[i].match(/}/g) || []).length;
    if (braceDepth === 0 && lines[i].includes('}')) {
      inLeadsImport836 = false;
    }
    skip = true;
  }
  
  if (lines[i].includes("timestamp: now.toISOString()")) {
    lines[i] = lines[i].replace("now.toISOString()", "new Date().toISOString()");
  }

  if (!skip) newLines.push(lines[i]);
}

fs.writeFileSync('server.ts', newLines.join('\n'));

// 2. Fix test issues (vitest)
let authTest = fs.readFileSync('security-tests/auth-sessions.test.ts', 'utf-8');
authTest = authTest.replace("import { describe, it, expect } from 'vitest';", "// import { describe, it, expect } from 'vitest';");
fs.writeFileSync('security-tests/auth-sessions.test.ts', authTest);

// 3. Fix logger.ts SecurityContext export issue
// The issue is `SecurityContext` is NOT exported in `policy.ts`. Let's export it.
let policyTs = fs.readFileSync('server/policy.ts', 'utf-8');
policyTs = policyTs.replace("type SecurityContext =", "export type SecurityContext =");
policyTs = policyTs.replace("interface SecurityContext {", "export interface SecurityContext {");
fs.writeFileSync('server/policy.ts', policyTs);

console.log("Fixes applied.");
