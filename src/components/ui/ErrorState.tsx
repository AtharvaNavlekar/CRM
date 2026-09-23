import React from 'react';
import { AlertCircle, Lock, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  statusCode?: number;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  statusCode,
  onRetry,
  className = ''
}) => {
  const isAuthError = statusCode === 401 || statusCode === 403;
  const resolvedTitle =
    title ||
    (statusCode === 403
      ? 'Access Restricted by Security Policy'
      : statusCode === 401
      ? 'Authentication Required'
      : statusCode === 404
      ? 'Resource Not Found'
      : statusCode === 422
      ? 'Compliance Validation Failure'
      : 'Operational Error Encountered');

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-[#BA1A1A]/20 bg-[#FFDAD6]/20 dark:bg-[#410002]/20 font-body ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#BA1A1A]/10 text-[#BA1A1A] dark:text-[#FFB4AB] flex items-center justify-center mb-3">
        {isAuthError ? <Lock className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
      </div>

      <h3 className="text-base font-semibold font-heading text-[#BA1A1A] dark:text-[#FFB4AB] mb-1">
        {resolvedTitle}
      </h3>

      <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] max-w-md mb-4 leading-relaxed">
        {message}
      </p>

      {statusCode && (
        <div className="mb-4">
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#BA1A1A]/10 text-[#BA1A1A] dark:text-[#FFB4AB]">
            HTTP {statusCode}
          </span>
        </div>
      )}

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
