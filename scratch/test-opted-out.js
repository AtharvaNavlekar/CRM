const { db } = require('./server/db/client.js');
const { leads } = require('./server/db/schema.js');

async function check() {
  const all = await db.select().from(leads);
  const dnd = all.find(l => l.name.includes('DND'));
  console.log("DND Lead:", JSON.stringify(dnd, null, 2));
  console.log("Preferences type:", typeof dnd.preferences);
  
  const isOptedOut = Boolean(dnd.preferences?.isOptedOut || dnd.isOptedOut);
  console.log("isOptedOut:", isOptedOut);
}

check().catch(console.error).finally(() => process.exit());
