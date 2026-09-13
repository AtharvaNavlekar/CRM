import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import 'dotenv/config';

// 1. Verify Configuration & Arguments
const backupFilename = process.argv[2];

if (!backupFilename) {
  console.error('ERROR: Backup file path argument required.');
  console.error('Usage: npx tsx scripts/restore.ts <path-to-backup.dump>');
  process.exit(1);
}

const backupPath = path.resolve(backupFilename);
if (!existsSync(backupPath)) {
  console.error(`ERROR: Backup file not found at ${backupPath}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is not set in the environment.');
  process.exit(1);
}

// 2. Safety Check
if (process.env.RESTORE_CONFIRM !== 'true') {
  console.error('====================================================');
  console.error('                       WARNING');
  console.error('====================================================');
  console.error('You are about to RESTORE a database and OVERWRITE data.');
  console.error(`Target Database: ${databaseUrl.split('@')[1]?.split('/')[1]?.split('?')[0]}`);
  console.error(`Source Backup:   ${backupPath}`);
  console.error('');
  console.error('To proceed, you MUST set RESTORE_CONFIRM=true');
  console.error('Example: RESTORE_CONFIRM=true npx tsx scripts/restore.ts <backup-file>');
  console.error('====================================================');
  process.exit(1);
}

console.log(`[Restore] Starting PostgreSQL restore...`);
console.log(`[Restore] Source: ${backupPath}`);

// 3. Execute pg_restore
try {
  // -c: Clean (drop) database objects before recreating
  // -1: Execute as a single transaction (if possible)
  // -d: target DB URL
  console.log(`[Restore] Running pg_restore...`);
  execSync(`pg_restore -c -1 -d "${databaseUrl}" "${backupPath}"`, {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log(`[Restore] pg_restore completed successfully.`);
} catch (error: any) {
  console.error(`[Restore] ERROR: pg_restore failed.`);
  console.error(`[Restore] Details: ${error.message}`);
  process.exit(1);
}

// 4. Validate Schema (Smoke Test)
try {
  console.log(`[Restore] Validating schema...`);
  // Check if critical tables exist
  const result = execSync(`psql "${databaseUrl}" -c "SELECT count(*) FROM users;"`, {
    stdio: 'pipe',
    env: { ...process.env }
  });
  console.log(`[Restore] Validation query success. Users count: ${result.toString().trim().split('\n')[2]?.trim()}`);
} catch (error: any) {
  console.error(`[Restore] ERROR: Validation query failed. Database may be corrupt or empty.`);
  process.exit(1);
}

console.log(`[Restore] SUCCESS. Restoration verified.`);
