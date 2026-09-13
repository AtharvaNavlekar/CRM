import express from 'express';

// Standardized error taxonomy
export type ErrorCategory = 
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'COMPLIANCE_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_ERROR'
  | 'TIMEOUT'
  | 'DATABASE_ERROR'
  | 'QUEUE_ERROR'
  | 'AI_PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    public category: ErrorCategory,
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function globalErrorHandler(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  let statusCode = 500;
  let category: ErrorCategory = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    category = err.category;
    message = err.message;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    category = 'VALIDATION_ERROR';
    message = 'Invalid JSON payload';
  } else if (err.code === '23505') { // Postgres unique violation
    statusCode = 409;
    category = 'CONFLICT';
    message = 'Resource already exists';
  } else if (err.code === '23503') { // Postgres foreign key violation
    statusCode = 400;
    category = 'VALIDATION_ERROR';
    message = 'Referenced resource does not exist';
  } else {
    // Log unexpected programming errors or non-AppErrors deeply
    if (req.log) {
      req.log.error('Unhandled Rejection/Exception', err, { errorCategory: category });
    } else {
      console.error('Unhandled Exception outside request context:', err);
    }
  }

  // Ensure 500 errors don't leak internals
  if (statusCode >= 500) {
    message = 'An unexpected internal error occurred';
  }

  const errorResponse = {
    error: {
      code: category,
      message,
      requestId: req.securityContext?.requestId || 'unknown'
    }
  };

  res.status(statusCode).json(errorResponse);
}
