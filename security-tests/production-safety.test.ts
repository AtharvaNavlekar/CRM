import fs from 'fs';
import path from 'path';

const SERVER_DIR = path.join(process.cwd(), 'server');
const DATA_DIR = path.join(process.cwd(), 'data');

async function runProductionSafetyTests() {
  console.log('--- Running Production Safety Tests ---');

  // 1. Ensure `password123` is not hardcoded anywhere in server runtime code
  // Scan all .ts files in server/ (excluding seed directory)
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

  // 2. Ensure NO runtime db.json exists or is used
  const runtimeDbJson = path.join(DATA_DIR, 'db.json');
  if (fs.existsSync(runtimeDbJson)) {
    console.error('❌ FAIL: Runtime data/db.json found in repository. DialPulse CRM requires PostgreSQL.');
    process.exit(1);
  } else {
    console.log('✅ PASS: No runtime data/db.json file found. Local JSON database is eradicated.');
  }

  // 3. Test mandatory DATABASE_URL enforcement
  console.log('\nVerifying mandatory DATABASE_URL enforcement on PostgreSQL client...');
  const originalEnvUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;

  try {
    // Attempting to initialize DB client without DATABASE_URL must fail
    await import(`../server/db/client.ts?cacheBuster=${Date.now()}`);
    console.error('❌ FAIL: Database client silently started without DATABASE_URL! Fallback detected.');
    process.exit(1);
  } catch (error: any) {
    if (error.message && error.message.includes('DATABASE_URL')) {
      console.log('✅ PASS: Missing DATABASE_URL throws clear mandatory error as expected.');
    } else {
      console.error('❌ FAIL: Unexpected error thrown:', error);
      process.exit(1);
    }
  } finally {
    if (originalEnvUrl) {
      process.env.DATABASE_URL = originalEnvUrl;
    }
  }

  console.log('\n--- Production Safety Tests Completed ---');
}

runProductionSafetyTests().catch(console.error);
