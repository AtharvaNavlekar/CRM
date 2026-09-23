import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading operational data...',
  size = 'md',
  fullHeight = false,
  className = ''
}) => {
  const spinnerSizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10'
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center font-body ${
        fullHeight ? 'min-h-[300px] h-full' : 'py-8'
      } ${className}`}
      aria-live="polite"
    >
      <Loader2
        className={`${spinnerSizes} text-[#00695C] dark:text-[#80D5C4] animate-spin mb-3`}
      />
      {label && (
        <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] tracking-wide">
          {label}
        </p>
      )}
    </div>
  );
};
