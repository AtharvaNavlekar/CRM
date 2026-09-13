import { SecurityContext } from '../../src/types';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogFormat {
  timestamp: string;
  level: LogLevel;
  message: string;
  service?: string;
  environment: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  errorCategory?: string;
  errorDetail?: any;
  [key: string]: any;
}

const SENSITIVE_KEYS = [
  'password', 'token', 'authorization', 'api_key', 'secret',
  'refreshtoken', 'accesstoken', 'creditcard', 'ssn', 'session'
];

export class Logger {
  private service: string;
  private environment: string;

  constructor(service: string = 'api') {
    this.service = service;
    this.environment = process.env.NODE_ENV || 'development';
  }

  private redact(obj: any): any {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.redact(item));
    }

    const redactedObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const isSensitive = SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk));
      if (isSensitive) {
        redactedObj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redactedObj[key] = this.redact(value);
      } else {
        redactedObj[key] = value;
      }
    }
    return redactedObj;
  }

  private buildLog(
    level: LogLevel,
    message: string,
    context?: Partial<LogFormat>,
    securityContext?: SecurityContext
  ): LogFormat {
    const log: LogFormat = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      environment: this.environment,
      ...this.redact(context || {})
    };

    if (securityContext) {
      log.requestId = securityContext.requestId;
      if (securityContext.actorUserId) log.userId = securityContext.actorUserId;
      if (securityContext.tenantId) log.tenantId = securityContext.tenantId;
    }

    return log;
  }

  private emit(log: LogFormat) {
    if (log.level === 'DEBUG' && this.environment === 'production' && process.env.ENABLE_DEBUG !== 'true') {
      return;
    }
    const out = JSON.stringify(log);
    if (log.level === 'ERROR' || log.level === 'FATAL') {
      process.stderr.write(out + '\n');
    } else {
      process.stdout.write(out + '\n');
    }
  }

  debug(message: string, context?: Partial<LogFormat>, secCtx?: SecurityContext) {
    this.emit(this.buildLog('DEBUG', message, context, secCtx));
  }

  info(message: string, context?: Partial<LogFormat>, secCtx?: SecurityContext) {
    this.emit(this.buildLog('INFO', message, context, secCtx));
  }

  warn(message: string, context?: Partial<LogFormat>, secCtx?: SecurityContext) {
    this.emit(this.buildLog('WARN', message, context, secCtx));
  }

  error(message: string, error?: any, context?: Partial<LogFormat>, secCtx?: SecurityContext) {
    this.emit(this.buildLog('ERROR', message, {
      ...context,
      errorDetail: error instanceof Error ? { message: error.message, stack: error.stack } : error
    }, secCtx));
  }

  fatal(message: string, error?: any, context?: Partial<LogFormat>, secCtx?: SecurityContext) {
    this.emit(this.buildLog('FATAL', message, {
      ...context,
      errorDetail: error instanceof Error ? { message: error.message, stack: error.stack } : error
    }, secCtx));
  }
}

export const logger = new Logger('crm-api');
