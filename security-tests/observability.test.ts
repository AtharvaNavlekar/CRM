import { BASE_URL, TestResult } from './helpers';

export async function runObservabilityTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Helper for recording test results
  const record = (name: string, passed: boolean, details: string, startTime: number, severity?: TestResult['severity']) => {
    results.push({
      category: 'Observability & Telemetry',
      name,
      passed,
      details,
      severity: passed ? undefined : severity,
      executionTimeMs: Date.now() - startTime
    });
  };

  // Test 1: Liveness Endpoint
  let start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/health/live`);
    const body = await res.json();
    if (res.status === 200 && body.status === 'ok') {
      record('Liveness Endpoint (/health/live)', true, 'Endpoint returns 200 OK.', start);
    } else {
      record('Liveness Endpoint (/health/live)', false, `Unexpected response: ${res.status}`, start, 'Medium');
    }
  } catch (err: any) {
    record('Liveness Endpoint (/health/live)', false, `Error: ${err.message}`, start, 'Medium');
  }

  // Test 2: Readiness Endpoint
  start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/health/ready`);
    const body = await res.json();
    if (res.status === 200 && body.status === 'ok' && body.database) {
      record('Readiness Endpoint (/health/ready)', true, 'Endpoint returns database status.', start);
    } else {
      record('Readiness Endpoint (/health/ready)', false, `Unexpected response: ${res.status}`, start, 'Medium');
    }
  } catch (err: any) {
    record('Readiness Endpoint (/health/ready)', false, `Error: ${err.message}`, start, 'Medium');
  }

  // Test 3: Metrics Endpoint
  start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/metrics`);
    const text = await res.text();
    if (res.status === 200 && text.includes('http_requests_total')) {
      record('Prometheus Metrics Endpoint (/metrics)', true, 'Metrics exposed correctly.', start);
    } else {
      record('Prometheus Metrics Endpoint (/metrics)', false, `Unexpected metrics response.`, start, 'Medium');
    }
  } catch (err: any) {
    record('Prometheus Metrics Endpoint (/metrics)', false, `Error: ${err.message}`, start, 'Medium');
  }

  // Test 4: Global Error Handler Normalization
  start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/non-existent-route-1234`);
    const body = await res.json();
    if (res.status === 404 && body.error && body.error.code === 'NOT_FOUND' && body.error.requestId && !body.error.stack) {
      record('Global Error Handler (Taxonomy & PII Stripping)', true, 'Normalized error returned without stack trace.', start);
    } else {
      record('Global Error Handler (Taxonomy & PII Stripping)', false, `Error object malformed or leaked stack trace.`, start, 'High');
    }
  } catch (err: any) {
    record('Global Error Handler (Taxonomy & PII Stripping)', false, `Error: ${err.message}`, start, 'High');
  }

  return results;
}
