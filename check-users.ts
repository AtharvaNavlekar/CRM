import { db } from './server/db/client';
import { users } from './server/db/schema';

async function run() {
  const allUsers = await db.select().from(users);
  console.log('Total users:', allUsers.length);
  if (allUsers.length > 0) {
    console.log(allUsers.map(u => `${u.name} | ${u.email} | ${u.role}`).join('\n'));
  }
  process.exit(0);
}
run().catch(console.error);
