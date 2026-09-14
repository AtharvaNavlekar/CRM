import { db } from './server/db/client.js';
import { users } from './server/db/schema.js';

async function check() {
  try {
    const allUsers = await db.select().from(users);
    console.log('Users in DB:');
    allUsers.forEach(u => console.log(u.email, u.name, u.role));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
