import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  kicker?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  kicker,
  badge,
  actions,
  filters,
  className = ''
}) => {
  return (
    <div
      className={`border-b border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111514] px-4 sm:px-6 py-4 transition-colors ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Title and Context */}
        <div className="space-y-1 min-w-0">
          {kicker && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#00695C] dark:text-[#80D5C4] font-body">
              {kicker}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#0F172A] dark:text-[#F1F5F9] tracking-tight truncate">
              {title}
            </h1>
            {badge && <div className="shrink-0">{badge}</div>}
          </div>

          {description && (
            <p className="text-xs sm:text-sm text-[#475569] dark:text-[#94A3B8] font-body max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls */}
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            {actions}
          </div>
        )}
      </div>

      {/* Optional Filters or Tabs row */}
      {filters && (
        <div className="mt-4 pt-3 border-t border-[#F1F5F4] dark:border-[#1F2423]">
          {filters}
        </div>
      )}
    </div>
  );
};
