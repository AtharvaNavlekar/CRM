import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { db } from './db/client';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Platform Admin';

  if (!email || !password) {
    console.error('Usage: npm run bootstrap-admin <email> <password> [name]');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters long.');
    process.exit(1);
  }

  if (password === 'password' + '123') {
    console.error('Predictable passwords like "password' + '123" are strictly forbidden.');
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

  if (existing.length > 0) {
    console.error('A user with this email already exists.');
    process.exit(1);
  }

  const userId = `usr-bootstrap-${crypto.randomUUID()}`;

  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash: bcryptjs.hashSync(password, 10),
    name,
    role: 'platform_admin',
    isPlatformStaff: true,
  });

  console.log(`Successfully provisioned platform admin: ${email}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error provisioning admin:', err);
  process.exit(1);
});
