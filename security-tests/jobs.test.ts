// security-tests/jobs.test.ts
// Category: Background Jobs & Tenant Isolation

import { request, getAuthToken, TestResult } from './helpers';

export async function runJobsTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const adminToken = await getAuthToken('admin');

  // --------------------------------------------------------------------------
  // TEST 12.1: Enqueue Job & Status Retrieval
  // --------------------------------------------------------------------------
  {
    const start = Date.now();
    try {
      // 1. Admin enqueues an export job
      const exportRes = await request('/api/leads/export?format=csv', {
        method: 'GET',
        token: adminToken
      });

      const jobId = exportRes.data?.jobId;
      const queuedSuccessfully = exportRes.status === 202 && Boolean(jobId);

      if (!queuedSuccessfully) {
        console.error('Enqueue failed:', exportRes.status, exportRes.data);
      }

      // 2. Admin retrieves the job status
      let jobFetchSuccess = false;
      if (jobId) {
        const fetchRes = await request(`/api/jobs/${jobId}`, {
          method: 'GET',
          token: adminToken
        });
        jobFetchSuccess = fetchRes.status === 200 && fetchRes.data?.id === jobId;
        if (!jobFetchSuccess) {
          console.error('Fetch failed:', fetchRes.status, fetchRes.data);
        }
      }

      results.push({
        category: 'Background Jobs',
        name: 'Job Enqueuing and Status Retrieval',
        passed: queuedSuccessfully && jobFetchSuccess,
        severity: 'High',
        details: (queuedSuccessfully && jobFetchSuccess)
          ? 'Secure: Jobs queued successfully and status is retrievable.'
          : 'VULNERABILITY: Job enqueuing or retrieval failed.',
        executionTimeMs: Date.now() - start
      });
    } catch (e: any) {
      results.push({
        category: 'Background Jobs',
        name: 'Job Enqueuing and Status Retrieval',
        passed: false,
        severity: 'High',
        details: `Test error: ${e.message}`,
        executionTimeMs: Date.now() - start
      });
    }
  }

  return results;
}
