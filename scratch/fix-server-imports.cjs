const fs = require('fs');

// Fix server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');

// Fix the Drizzle imports
serverCode = serverCode.replace(
  "import { eq, sql, and, desc } from 'drizzle-orm';",
  "import { eq, sql, and, desc, or, ilike, inArray } from 'drizzle-orm';\nimport * as schema from './server/db/schema';"
);

// Fix the Policy imports
serverCode = serverCode.replace(
  "import { can } from './server/policy';",
  "import { can, getScope } from './server/policy';"
);

// Fix Compliance imports
serverCode = serverCode.replace(
  "checkCompliance,\n  validateLeadCommunicationCompliance,",
  "checkCompliance,\n  evaluateCompliance,\n  validateLeadCommunicationCompliance,"
);

fs.writeFileSync('server.ts', serverCode);
console.log('Fixed server.ts imports');

// Fix server/db.ts
let dbCode = fs.readFileSync('server/db.ts', 'utf8');

// Remove tenantSettings from the import because it doesn't exist in schema
dbCode = dbCode.replace(
  ", tenantSettings } from './db/schema';",
  "} from './db/schema';"
);

// Fix the leadsObj and callsObj scope errors
// Just rename them to avoid block-scope conflicts if any
dbCode = dbCode.replace(
  "let leadsObj;",
  "let leadsObj: any;"
);
dbCode = dbCode.replace(
  "let callsObj;",
  "let callsObj: any;"
);

fs.writeFileSync('server/db.ts', dbCode);
console.log('Fixed server/db.ts issues');
