import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAF9]/50 dark:bg-[#161A19]/50 font-body ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#CCE8E1]/50 dark:bg-[#004F46]/40 text-[#00695C] dark:text-[#80D5C4] flex items-center justify-center mb-3">
          {icon}
        </div>
      )}

      <h3 className="text-base font-semibold font-heading text-[#0F172A] dark:text-[#F1F5F9] mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] max-w-sm mb-5 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-3">
          {actionLabel && onAction && (
            <Button variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
