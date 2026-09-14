import { db } from '../server/db/client';
import { users } from '../server/db/schema';

async function run() {
  const allUsers = await db.select().from(users);
  console.log(allUsers);
  process.exit(0);
}
run();
