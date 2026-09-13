const fs = require('fs');

let schema = fs.readFileSync('server/db/schema.ts', 'utf8');

// 1. Leads: drop .notNull() on assignedRepName
schema = schema.replace(
  "assignedRepName: text('assigned_rep_name').notNull(),",
  "assignedRepName: text('assigned_rep_name'),"
);
schema = schema.replace(
  "notes: text('notes').notNull(),",
  "notes: text('notes'),"
);

// 2. Calls: add teamId, complianceFlags
schema = schema.replace(
  "leadPhone: text('lead_phone').notNull(),",
  "leadPhone: text('lead_phone'),"
);
schema = schema.replace(
  "leadName: text('lead_name').notNull(),",
  "leadName: text('lead_name'),"
);
schema = schema.replace(
  "repName: text('rep_name').notNull(),",
  "repName: text('rep_name'),"
);
schema = schema.replace(
  "outcome: text('outcome').notNull(),",
  "outcome: text('outcome').notNull(),\n  teamId: text('team_id'),\n  complianceFlags: jsonb('compliance_flags'),"
);

// 3. Messages: add repId, teamId, channel
schema = schema.replace(
  "direction: text('direction').notNull(),",
  "direction: text('direction').notNull(),\n  repId: text('rep_id'),\n  teamId: text('team_id'),\n  channel: text('channel'),"
);
schema = schema.replace(
  "deliveryStatus: text('delivery_status').notNull(),",
  "deliveryStatus: text('delivery_status'),\n  status: text('status'),"
);

// 4. Add tenantSettings table at the end
if (!schema.includes('tenantSettings')) {
  schema += `
export const tenantSettings = pgTable('tenant_settings', {
  tenantId: text('tenant_id').primaryKey(),
  settings: jsonb('settings').notNull(),
});
`;
}

fs.writeFileSync('server/db/schema.ts', schema, 'utf8');

let server = fs.readFileSync('server.ts', 'utf8');

// fix newCall in server.ts
server = server.replace(
  "disposition: disposition || 'Connected',",
  "outcome: disposition || 'Connected',"
);

server = server.replace(
  "status: 'sent'",
  "status: 'sent',\n      deliveryStatus: 'sent'"
);
server = server.replace(
  "status: 'delivered'",
  "status: 'delivered',\n      deliveryStatus: 'delivered'"
);

fs.writeFileSync('server.ts', server, 'utf8');
console.log('Done fixing types');
