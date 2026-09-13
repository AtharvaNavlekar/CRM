import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import { DatabaseState, User } from '../src/types';

// Utility to write to the db file safely
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function loadDb(): DatabaseState {
  if (!fs.existsSync(DB_FILE)) {
    throw new Error('Database not found. Start the server first to initialize the schema.');
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDb(db: DatabaseState) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

function run() {
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

  const db = loadDb();

  if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    console.error('A user with this email already exists.');
    process.exit(1);
  }

  const newUser: User = {
    id: `usr-bootstrap-${crypto.randomUUID()}`,
    email,
    passwordHash: bcryptjs.hashSync(password, 10),
    name,
    role: 'platform_admin',
    isPlatformStaff: true,
    createdDate: new Date().toISOString()
  };

  db.users.push(newUser);
  saveDb(db);

  console.log(`Successfully provisioned platform admin: ${email}`);
}

run();
