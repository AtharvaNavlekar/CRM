// Minimal, zero-dependency Prometheus-compatible metrics registry

interface MetricLabels {
  [key: string]: string | number;
}

class Counter {
  private values: Map<string, number> = new Map();

  constructor(public name: string, public help: string) {}

  inc(labels: MetricLabels = {}, value: number = 1) {
    const key = JSON.stringify(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  toString(): string {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`;
    for (const [key, val] of this.values.entries()) {
      const parsed = JSON.parse(key);
      const labelStr = Object.entries(parsed)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      out += `${this.name}${labelStr ? `{${labelStr}}` : ''} ${val}\n`;
    }
    return out;
  }
}

class Histogram {
  private buckets: number[];
  private values: Map<string, { count: number; sum: number; buckets: number[] }> = new Map();

  constructor(public name: string, public help: string, buckets: number[] = [10, 50, 100, 250, 500, 1000, 5000]) {
    this.buckets = buckets;
  }

  observe(labels: MetricLabels = {}, value: number) {
    const key = JSON.stringify(labels);
    if (!this.values.has(key)) {
      this.values.set(key, { count: 0, sum: 0, buckets: new Array(this.buckets.length).fill(0) });
    }
    
    const entry = this.values.get(key)!;
    entry.count += 1;
    entry.sum += value;
    
    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]) {
        entry.buckets[i] += 1;
      }
    }
  }

  toString(): string {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} histogram\n`;
    for (const [key, val] of this.values.entries()) {
      const parsed = JSON.parse(key);
      const labelStr = Object.entries(parsed)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      
      const prefix = labelStr ? `{${labelStr},` : '{';
      
      let cumulative = 0;
      for (let i = 0; i < this.buckets.length; i++) {
        cumulative += val.buckets[i];
        out += `${this.name}_bucket${prefix}le="${this.buckets[i]}"} ${cumulative}\n`;
      }
      out += `${this.name}_bucket${prefix}le="+Inf"} ${val.count}\n`;
      out += `${this.name}_sum${labelStr ? `{${labelStr}}` : ''} ${val.sum}\n`;
      out += `${this.name}_count${labelStr ? `{${labelStr}}` : ''} ${val.count}\n`;
    }
    return out;
  }
}

class MetricsRegistry {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  createCounter(name: string, help: string): Counter {
    const counter = new Counter(name, help);
    this.counters.set(name, counter);
    return counter;
  }

  createHistogram(name: string, help: string, buckets?: number[]): Histogram {
    const histogram = new Histogram(name, help, buckets);
    this.histograms.set(name, histogram);
    return histogram;
  }

  metrics(): string {
    let out = '';
    for (const counter of this.counters.values()) {
      out += counter.toString() + '\n';
    }
    for (const histogram of this.histograms.values()) {
      out += histogram.toString() + '\n';
    }
    return out;
  }
}

export const metricsRegistry = new MetricsRegistry();

// Define canonical metrics

export const httpRequestCount = metricsRegistry.createCounter('http_requests_total', 'Total HTTP requests');
export const httpRequestDuration = metricsRegistry.createHistogram('http_request_duration_ms', 'HTTP request duration in ms');

export const authFailureCount = metricsRegistry.createCounter('auth_failures_total', 'Total authentication/authorization failures');
export const impersonationAttempts = metricsRegistry.createCounter('impersonation_attempts_total', 'Total impersonation attempts');

export const jobProcessedCount = metricsRegistry.createCounter('job_processed_total', 'Background jobs processed');
export const jobFailedCount = metricsRegistry.createCounter('job_failed_total', 'Background jobs failed');
export const jobDuration = metricsRegistry.createHistogram('job_duration_ms', 'Background job processing duration');

export const aiRequestCount = metricsRegistry.createCounter('ai_requests_total', 'AI requests made');
export const aiErrorCount = metricsRegistry.createCounter('ai_errors_total', 'AI provider errors');
export const aiLatency = metricsRegistry.createHistogram('ai_latency_ms', 'AI provider latency');

export const dbConnectionErrors = metricsRegistry.createCounter('db_connection_errors_total', 'Database connection errors');
export const redisConnectionErrors = metricsRegistry.createCounter('redis_connection_errors_total', 'Redis connection errors');
