import React from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  count?: number;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  count,
  actions,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 mb-3 font-body ${className}`}>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold font-heading text-[#0F172A] dark:text-[#F1F5F9]">
            {title}
          </h2>
          {typeof count === 'number' && (
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 rounded-sm bg-[#F1F5F4] dark:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8]">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
            {description}
          </p>
        )}
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};
