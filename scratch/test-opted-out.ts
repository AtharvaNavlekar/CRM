import { db } from '../server/db/client';
import { leads } from '../server/db/schema';

async function check() {
  const all = await db.select().from(leads);
  const dnd = all.find(l => l.name.includes('DND'));
  console.log("DND Lead:", JSON.stringify(dnd, null, 2));
  console.log("Preferences type:", typeof dnd.preferences);
  
  const isOptedOut = Boolean((dnd.preferences as any)?.isOptedOut || (dnd as any).isOptedOut);
  console.log("isOptedOut:", isOptedOut);
}

check().catch(console.error).finally(() => process.exit());
