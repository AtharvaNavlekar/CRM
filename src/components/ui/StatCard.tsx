import React from 'react';
import { Card } from './Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  subtext?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  subtext,
  icon,
  onClick,
  className = ''
}) => {
  return (
    <Card
      elevation={onClick ? 'interactive' : 'surface'}
      onClick={onClick}
      className={`relative overflow-hidden font-body ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] tracking-wider uppercase font-body">
            {label}
          </p>
          <div className="text-2xl sm:text-3xl font-bold font-heading text-[#0F172A] dark:text-[#F1F5F9] tabular-nums tracking-tight">
            {value}
          </div>
        </div>

        {icon && (
          <div className="w-10 h-10 rounded-xl bg-[#CCE8E1]/60 dark:bg-[#004F46]/50 text-[#00695C] dark:text-[#80D5C4] flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      {(delta || subtext) && (
        <div className="mt-3 pt-2.5 border-t border-[#F1F5F4] dark:border-[#202726] flex items-center gap-2 text-xs">
          {delta && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                delta.isPositive
                  ? 'text-[#065F46] dark:text-[#6EE7B7]'
                  : 'text-[#991B1B] dark:text-[#FCA5A5]'
              }`}
            >
              {delta.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {delta.value}
            </span>
          )}
          {delta?.label && (
            <span className="text-[#64748B] dark:text-[#94A3B8]">{delta.label}</span>
          )}
          {subtext && !delta && (
            <span className="text-[#64748B] dark:text-[#94A3B8]">{subtext}</span>
          )}
        </div>
      )}
    </Card>
  );
};
