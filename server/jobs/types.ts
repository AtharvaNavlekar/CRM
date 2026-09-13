import { SecurityContext } from '../policy';

export type JobType = 'EXPORT_LEADS' | 'IMPORT_LEADS' | 'BULK_UPDATE_LEADS';

export interface BaseJobPayload {
  jobId: string; // Internal DB job ID
  tenantId: string;
  securityContext: SecurityContext;
}

export interface ExportLeadsPayload extends BaseJobPayload {
  format: 'json' | 'csv';
  // Include filters, search, etc in a real app
}

export interface ImportLeadsPayload extends BaseJobPayload {
  leads: any[]; // The parsed CSV objects
}

export interface BulkUpdateLeadsPayload extends BaseJobPayload {
  leadIds: string[];
  stage?: string;
  assignedRepId?: string;
}

export type JobPayload =
  | ExportLeadsPayload
  | ImportLeadsPayload
  | BulkUpdateLeadsPayload;
