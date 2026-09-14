const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

// Patch POST /api/leads
content = content.replace(
  'const { name, phone, email, source, notes, priority, stage, assignedRepId } = req.body;',
  'const { name, phone, email, source, notes, priority, stage, assignedRepId, preferences, customFields, fatigueStatus, contactAttempts7d } = req.body;'
);

content = content.replace(
  '      teamId: teamId || null,\n      customFields: {}',
  '      teamId: teamId || null,\n      fatigueStatus: fatigueStatus || null,\n      contactAttempts7d: contactAttempts7d || null,\n      preferences: preferences || null,\n      customFields: customFields || {}'
);

// Patch PUT /api/leads/:id
content = content.replace(
  'const { name, phone, email, source, stage, notes, priority, assignedRepId } = req.body;',
  'const { name, phone, email, source, stage, notes, priority, assignedRepId, preferences, customFields, fatigueStatus, contactAttempts7d } = req.body;'
);

content = content.replace(
  'if (priority) updates.priority = priority;\n    \n    if (assignedRepId !== undefined',
  'if (priority) updates.priority = priority;\n    if (preferences !== undefined) updates.preferences = preferences;\n    if (customFields !== undefined) updates.customFields = customFields;\n    if (fatigueStatus !== undefined) updates.fatigueStatus = fatigueStatus;\n    if (contactAttempts7d !== undefined) updates.contactAttempts7d = contactAttempts7d;\n    \n    if (assignedRepId !== undefined'
);

fs.writeFileSync(serverFile, content, 'utf8');
console.log('Patched server.ts successfully.');
