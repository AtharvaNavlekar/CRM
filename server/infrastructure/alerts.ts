import { logger } from './logger';
import { metricsRegistry } from './metrics';

export function evaluateAlerts() {
  const metrics = metricsRegistry.metrics();
  
  // Minimal regex extraction for alerting thresholds.
  // In a real Prometheus setup, Alertmanager handles this, but since we are native:

  const getMetricValue = (metricName: string) => {
    const regex = new RegExp(`^${metricName}(?:\\{.*\\})?\\s+([0-9.]+)$`, 'm');
    const match = metrics.match(regex);
    return match ? parseFloat(match[1]) : 0;
  };

  const aiErrors = getMetricValue('ai_errors_total');
  if (aiErrors > 10) {
    logger.error('[ALERT] HIGH_AI_ERROR_RATE', {
      alertType: 'AI_PROVIDER_ERROR',
      severity: 'HIGH',
      description: 'Sustained AI provider errors detected (>10 errors).'
    });
  }

  const authFailures = getMetricValue('auth_failures_total');
  if (authFailures > 50) {
    logger.warn('[ALERT] HIGH_AUTH_FAILURES', {
      alertType: 'AUTHENTICATION_SPIKE',
      severity: 'MEDIUM',
      description: 'Abnormal number of authentication failures detected.'
    });
  }

  const jobFailures = getMetricValue('job_failed_total');
  if (jobFailures > 20) {
    logger.error('[ALERT] HIGH_JOB_FAILURE_RATE', {
      alertType: 'WORKER_FAILURES',
      severity: 'HIGH',
      description: 'Background worker experiencing high failure rate.'
    });
  }

  const dbConnectionErrors = getMetricValue('db_connection_errors_total');
  if (dbConnectionErrors > 5) {
    logger.fatal('[ALERT] DATABASE_CONNECTION_EXHAUSTION', {
      alertType: 'DATABASE_ERROR',
      severity: 'CRITICAL',
      description: 'Database connection errors detected.'
    });
  }
}

// In production, run the evaluator every 60 seconds
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_ALERTS === 'true') {
  setInterval(evaluateAlerts, 60000);
}
