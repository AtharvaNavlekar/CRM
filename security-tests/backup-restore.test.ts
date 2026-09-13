import { execSync } from 'child_process';
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';

console.log('--- STARTING BACKUP & RESTORE SECURITY TEST ---');

// 1. Setup Environment
const sourceDb = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/crm_local';
const testDbName = 'crm_test_restore_' + Date.now();
const testDbUrl = `postgres://postgres:postgres@localhost:5432/${testDbName}`;
const rootDbUrl = 'postgres://postgres:postgres@localhost:5432/postgres';

try {
  execSync('psql --version', { stdio: 'ignore' });
} catch (e) {
  console.warn('[Test] Skipping backup/restore test: psql is not installed or not in PATH.');
  process.exit(0);
}

try {
  console.log(`[Test] Creating isolated test database: ${testDbName}`);
  execSync(`psql "${rootDbUrl}" -c "CREATE DATABASE ${testDbName};"`, { stdio: 'pipe' });
} catch (e: any) {
  console.error(`[Test] Failed to create test database. Make sure PostgreSQL is running locally.`);
  process.exit(1);
}

let backupFilePath = '';
let metaFilePath = '';

try {
  // 2. Test Backup
  console.log(`[Test] Running backup script against source DB...`);
  const backupOutput = execSync(`npx tsx scripts/backup.ts`, { 
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: sourceDb } 
  }).toString();
  
  console.log(backupOutput);

  // Extract the generated backup path from stdout
  const match = backupOutput.match(/Target:\s+(.*\.dump)/);
  if (!match || !match[1]) {
    throw new Error("Could not parse backup path from script output.");
  }
  backupFilePath = match[1].trim();
  metaFilePath = backupFilePath.replace('.dump', '.meta.json');

  if (!existsSync(backupFilePath)) {
    throw new Error(`Backup file does not exist at ${backupFilePath}`);
  }
  if (!existsSync(metaFilePath)) {
    throw new Error(`Metadata file does not exist at ${metaFilePath}`);
  }

  const meta = JSON.parse(readFileSync(metaFilePath, 'utf8'));
  if (!meta.timestamp || !meta.sizeBytes) {
    throw new Error("Metadata file is missing required fields.");
  }
  console.log(`[Test] Backup successful and metadata validated.`);

  // 3. Test Restore (Without confirmation - should fail)
  console.log(`[Test] Verifying restore fails without RESTORE_CONFIRM...`);
  try {
    execSync(`npx tsx scripts/restore.ts "${backupFilePath}"`, {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: testDbUrl }
    });
    throw new Error("Restore script should have failed without RESTORE_CONFIRM=true");
  } catch (e: any) {
    if (e.message.includes("Restore script should have failed")) {
      throw e;
    }
    console.log(`[Test] Restore correctly aborted without confirmation.`);
  }

  // 4. Test Restore (With confirmation - should succeed)
  console.log(`[Test] Running restore script against isolated test DB...`);
  const restoreOutput = execSync(`npx tsx scripts/restore.ts "${backupFilePath}"`, {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: testDbUrl, RESTORE_CONFIRM: 'true' }
  }).toString();

  console.log(restoreOutput);
  if (!restoreOutput.includes("SUCCESS. Restoration verified.")) {
    throw new Error("Restore output did not contain success message.");
  }
  console.log(`[Test] Restore successful.`);

  // 5. Deep Validation of Restored Data
  console.log(`[Test] Validating restored data...`);
  const userCount = execSync(`psql "${testDbUrl}" -t -c "SELECT count(*) FROM users;"`, { stdio: 'pipe' }).toString().trim();
  if (parseInt(userCount, 10) === 0) {
    console.warn(`[Test] Warning: 0 users restored. If the source database was empty, this is expected.`);
  } else {
    console.log(`[Test] Verified ${userCount} users restored successfully.`);
  }

  const auditCount = execSync(`psql "${testDbUrl}" -t -c "SELECT count(*) FROM audit_logs;"`, { stdio: 'pipe' }).toString().trim();
  console.log(`[Test] Verified ${auditCount} audit logs restored securely.`);

} catch (error: any) {
  console.error(`[Test] ERROR during backup/restore tests:`, error.message);
  process.exitCode = 1;
} finally {
  // 6. Cleanup
  console.log(`[Test] Cleaning up isolated test database...`);
  try {
    // Drop connections before dropping DB
    execSync(`psql "${rootDbUrl}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${testDbName}';"`, { stdio: 'ignore' });
    execSync(`psql "${rootDbUrl}" -c "DROP DATABASE IF EXISTS ${testDbName};"`, { stdio: 'pipe' });
    console.log(`[Test] Cleaned up ${testDbName}.`);
  } catch (e) {
    console.error(`[Test] Failed to clean up test database ${testDbName}.`);
  }

  if (backupFilePath && existsSync(backupFilePath)) {
    rmSync(backupFilePath);
    rmSync(metaFilePath);
    console.log(`[Test] Cleaned up test backup artifacts.`);
  }
}

if (process.exitCode !== 1) {
  console.log('--- BACKUP & RESTORE TESTS PASSED ---');
} else {
  console.error('--- BACKUP & RESTORE TESTS FAILED ---');
}
