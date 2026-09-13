import express from 'express';
import { logger } from '../infrastructure/logger';
import { httpRequestCount, httpRequestDuration } from '../infrastructure/metrics';

export function telemetryMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const start = Date.now();
  
  // Attach safe log helper to request
  req.log = {
    info: (msg: string, ctx?: any) => logger.info(msg, ctx, req.securityContext),
    warn: (msg: string, ctx?: any) => logger.warn(msg, ctx, req.securityContext),
    error: (msg: string, err?: any, ctx?: any) => logger.error(msg, err, ctx, req.securityContext),
    debug: (msg: string, ctx?: any) => logger.debug(msg, ctx, req.securityContext)
  };

  // Skip spammy endpoints for access logging
  const skipLogging = req.path.startsWith('/api/health');

  res.on('finish', () => {
    const duration = Date.now() - start;
    const route = req.route?.path || req.path;
    const status = res.statusCode;
    
    // Classify status (2xx, 4xx, 5xx)
    const statusClass = `${Math.floor(status / 100)}xx`;

    if (!skipLogging) {
      httpRequestCount.inc({ method: req.method, route, status_class: statusClass });
      httpRequestDuration.observe({ method: req.method, route, status_class: statusClass }, duration);

      const logContext = {
        method: req.method,
        route,
        status,
        durationMs: duration
      };

      if (status >= 500) {
        req.log.error('Request failed with server error', null, logContext);
      } else if (status >= 400) {
        req.log.warn('Request failed with client error', logContext);
      } else {
        req.log.info('Request completed', logContext);
      }
    }
  });

  next();
}

declare global {
  namespace Express {
    interface Request {
      log: {
        info: (msg: string, ctx?: any) => void;
        warn: (msg: string, ctx?: any) => void;
        error: (msg: string, err?: any, ctx?: any) => void;
        debug: (msg: string, ctx?: any) => void;
      }
    }
  }
}
