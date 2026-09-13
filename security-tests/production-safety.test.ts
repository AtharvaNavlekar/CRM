import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SERVER_DIR = path.join(process.cwd(), 'server');

async function runProductionSafetyTests() {
  console.log('--- Running Production Safety Tests ---');

  // 1. Ensure `password123` is not hardcoded anywhere in server runtime code
  // We will scan all .ts files in server/ (excluding seed directory)
  const files = fs.readdirSync(SERVER_DIR);
  let password123Found = false;

  for (const file of files) {
    if (file.endsWith('.ts')) {
      const content = fs.readFileSync(path.join(SERVER_DIR, file), 'utf8');
      if (content.includes('password123')) {
        console.error(`❌ VULNERABILITY FOUND: Predictable default password "password123" found in ${file}`);
        password123Found = true;
      }
    }
  }

  if (!password123Found) {
    console.log('✅ No hardcoded "password123" found in core server files.');
  } else {
    process.exit(1);
  }

  // 2. Test NODE_ENV=production database loading
  console.log('\nSimulating NODE_ENV=production DB initialization...');
  
  // Backup existing DB if any
  let hasBackup = false;
  const backupPath = DB_FILE + '.bak';
  if (fs.existsSync(DB_FILE)) {
    fs.renameSync(DB_FILE, backupPath);
    hasBackup = true;
  }

  try {
    // Force NODE_ENV to production
    process.env.NODE_ENV = 'production';
    
    // Dynamically import db to trigger initialization
    const { getDb } = await import(`../server/db.ts?cacheBuster=${Date.now()}`);
    const db = getDb();

    if (db.users.length === 0) {
      console.log('✅ PASS: NODE_ENV=production does NOT automatically seed demo users.');
    } else {
      console.error(`❌ FAIL: NODE_ENV=production automatically seeded ${db.users.length} users!`);
      process.exit(1);
    }

    if (db.leads.length === 0) {
      console.log('✅ PASS: NODE_ENV=production does NOT automatically seed demo leads.');
    } else {
      console.error(`❌ FAIL: NODE_ENV=production automatically seeded ${db.leads.length} leads!`);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error during production DB init test:', error);
    process.exit(1);
  } finally {
    // Restore DB
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
    if (hasBackup) {
      fs.renameSync(backupPath, DB_FILE);
    }
    // Restore env
    process.env.NODE_ENV = 'development';
  }

  console.log('\n--- Production Safety Tests Completed ---');
}

runProductionSafetyTests().catch(console.error);
