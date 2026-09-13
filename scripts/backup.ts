import { execSync } from 'child_process';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import 'dotenv/config';

// 1. Verify Configuration
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL is not set in the environment.');
  process.exit(1);
}

const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups', 'db');
if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

// 2. Generate Backup Filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFilename = `crm-backup-${timestamp}.dump`;
const backupPath = path.join(backupDir, backupFilename);
const metadataPath = path.join(backupDir, `crm-backup-${timestamp}.meta.json`);

console.log(`[Backup] Starting PostgreSQL backup...`);
console.log(`[Backup] Target: ${backupPath}`);

// 3. Execute pg_dump
try {
  // Using -Fc for custom format (compressed, supports targeted pg_restore)
  execSync(`pg_dump -Fc "${databaseUrl}" -f "${backupPath}"`, {
    stdio: 'pipe', // Suppress output to prevent leaking credentials in logs
    env: { ...process.env }
  });
  
  console.log(`[Backup] pg_dump completed successfully.`);
} catch (error: any) {
  console.error(`[Backup] ERROR: pg_dump failed.`);
  console.error(`[Backup] Details: ${error.message}`);
  process.exit(1);
}

// 4. Validate Backup Integrity
if (!existsSync(backupPath)) {
  console.error(`[Backup] ERROR: Backup file was not created at ${backupPath}`);
  process.exit(1);
}

const stats = statSync(backupPath);
if (stats.size === 0) {
  console.error(`[Backup] ERROR: Backup file is empty (0 bytes).`);
  process.exit(1);
}

// 5. Write Metadata (Application Version, Timestamp, Size)
let appVersion = 'unknown';
try {
  appVersion = execSync('git rev-parse HEAD').toString().trim();
} catch(e) {
  // ignore
}

const metadata = {
  timestamp,
  appVersion,
  sizeBytes: stats.size,
  format: 'custom (-Fc)',
  database: databaseUrl.split('@')[1]?.split('/')[1]?.split('?')[0] || 'unknown',
};

writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`[Backup] SUCCESS. Backup validated.`);
console.log(`[Backup] Size: ${sizeMB} MB`);
console.log(`[Backup] Metadata saved to: ${metadataPath}`);
console.log(`[Backup] Ready for offsite storage upload.`);
