# Disaster Recovery & Backup Procedures

## 1. Objectives

- **RPO (Recovery Point Objective):** The maximum acceptable data loss is 24 hours via automated nightly backups. Where supported by the infrastructure provider (e.g., AWS RDS, Supabase), Point-In-Time-Recovery (PITR) enables a 5-minute RPO.
- **RTO (Recovery Time Objective):** Restoration of the database and application availability from object storage should take less than 1 hour.

## 2. Backup Strategy

DialPulse CRM utilizes a strict **PostgreSQL-native backup strategy**. 

- **Primary:** Automated logical backups using `pg_dump -Fc` via `scripts/backup.ts`.
- **Secondary (Infrastructure):** Managed provider snapshots and WAL (Write-Ahead Logging) archiving.
- **Storage:** Backups are securely uploaded to an isolated offsite Object Storage bucket (e.g., AWS S3). 
- **Separation of Privileges:** The runtime application identity does **NOT** possess permissions to delete backups or trigger destructive restores.
- **Immutability:** Backups in object storage must be configured with Object Lock (WORM) to prevent accidental or malicious deletion.
- **Retention Policy:**
  - Daily backups: Retained for 30 days.
  - Weekly backups: Retained for 12 weeks.
  - PITR / WAL logs: Retained for 7 days (managed provider).

### What is Backed Up?
- **Authoritative Data:** Users, Tenants, Leads, Calls, Messages, Tickets, Audit Logs, Policies, and Sessions. (This ensures that security evidence is fully preserved during a restore).
- **Not Backed Up:** Redis state (ephemeral caches, rate-limits). Redis state will be gracefully rebuilt by the application runtime.

## 3. Encryption
- **At Rest:** Managed by the infrastructure provider (SSE-S3 or SSE-KMS).
- **In Transit:** TLS is enforced on all database connections and backup transfers. No keys are hardcoded in the source code.

## 4. Operational Procedures

### Creating a Pre-Deployment Backup
Before running high-risk migrations (`npx drizzle-kit push`), execute a manual pre-deployment backup:

```bash
npx tsx scripts/backup.ts
```

This ensures a rollback point is available if the migration corrupts application data.

### Restoring a Backup
> [!CAUTION]
> Restoring a backup is a destructive operation that will overwrite the target database.

1. Provision a clean PostgreSQL instance (or target the existing corrupted instance).
2. Download the desired `.dump` artifact from Object Storage.
3. Verify the checksum and metadata (application version and timestamp) in the accompanying `.meta.json` file.
4. Execute the restore script:

```bash
RESTORE_CONFIRM=true DATABASE_URL="<target-db>" npx tsx scripts/restore.ts path/to/backup.dump
```

5. Run `npx tsx security-tests/production-safety.test.ts` or integration tests as smoke tests.
6. Verify audit logs, tenant structures, and user accounts are intact.
7. Restore live traffic.

## 5. Disaster Scenarios & Playbooks

### A. Accidental Data Deletion
- **Detection:** Customer reports missing leads or audit logs show unauthorized DELETE actions.
- **Action:** Identify the exact timestamp of the deletion. Use infrastructure PITR to restore the database to 1 minute prior to the event into a parallel temporary instance.
- **Recovery:** Extract the missing tenant's records from the temporary instance and re-insert them into production.

### B. Broken Migration
- **Detection:** `drizzle-kit push` fails or causes application HTTP 500s.
- **Action:** Immediately halt API traffic. 
- **Recovery:** Run `scripts/restore.ts` using the pre-deployment backup created prior to the migration.

### C. Compromised Application Credentials
- **Detection:** Suspicious data export or bulk deletion.
- **Action:** The application's database user has no permission to delete offsite backups. The attacker cannot destroy the recovery artifacts.
- **Recovery:** Rotate all API keys and DB credentials. Restore from the latest known-clean backup if data was compromised.

### D. Redis / Infrastructure Failure
- **Detection:** Application logs show Redis timeout.
- **Action:** Do nothing. The CRM is designed to degrade gracefully if Redis is unavailable. Authoritative data remains safely in PostgreSQL.

## 6. Tenant-Level Recovery
> [!IMPORTANT]
> **Status:** NOT YET SUPPORTED natively.
> Backups are currently database-wide. To recover a single tenant, operations must restore the full backup into a staging environment and manually export/import the specific tenant's rows, respecting foreign key constraints (Users -> Leads -> Calls).
