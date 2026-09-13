const fs = require('fs');

// 1. Fix schema.ts for lastContactDate
let schema = fs.readFileSync('server/db/schema.ts', 'utf8');
if (!schema.includes('last_contact_date')) {
  schema = schema.replace(
    "createdDate: timestamp('created_date', { mode: 'string' }).notNull(),",
    "createdDate: timestamp('created_date', { mode: 'string' }).notNull(),\n  lastContactDate: timestamp('last_contact_date', { mode: 'string' }),"
  );
  fs.writeFileSync('server/db/schema.ts', schema, 'utf8');
}

// 2. Fix server/db.ts for leadsObj/callsObj
let dbTs = fs.readFileSync('server/db.ts', 'utf8');
dbTs = dbTs.replace("eq(leadsObj.tenantId, tenantId)", "eq(leads.tenantId, tenantId)");
dbTs = dbTs.replace("eq(callsObj.tenantId, tenantId)", "eq(calls.tenantId, tenantId)");
fs.writeFileSync('server/db.ts', dbTs, 'utf8');

// 3. Fix server.ts
let server = fs.readFileSync('server.ts', 'utf8');

// Fix role casting
server = server.replace(
  "role: user.role,",
  "role: user.role as any,"
);
server = server.replace(
  "role: user.role,",
  "role: user.role as any,"
);

// Fix replacedBySessionId
server = server.replace(
  "replacedBySessionId: sessionId",
  "revokeReason: 'Token rotated'"
);

// Fix evaluateCompliance import and usage
if (!server.includes('evaluateCompliance')) {
  // It's already there on line 1169, but we need to import it.
}
server = server.replace(
  "import {",
  "import { evaluateCompliance } from './server/compliance';\nimport {"
);
server = server.replace(
  "const evaluation = evaluateCompliance(req.securityContext!.tenantId, entityType as string, dataObj);",
  "const policies = await compliancePolicyRepository.getEffectivePolicy(req.securityContext!.tenantId);\n    const evaluation = evaluateCompliance({ tenantId: req.securityContext!.tenantId, entityType: entityType as any, entityData: dataObj, policies });"
);

// Fix app.listen
server = server.replace(
  "app.listen(PORT, '0.0.0.0', () => {",
  "app.listen(Number(PORT) || 3000, () => {"
);

fs.writeFileSync('server.ts', server, 'utf8');
console.log('Fixes applied.');
