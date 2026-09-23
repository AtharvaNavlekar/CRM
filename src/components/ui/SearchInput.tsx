import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (val: string) => void;
  shortcut?: string;
  onClear?: () => void;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  shortcut,
  onClear,
  inputSize = 'md',
  placeholder = 'Search...',
  className = '',
  id = 'global-search-input',
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-8 text-xs pl-8 pr-7',
    md: 'h-10 text-sm pl-9 pr-8',
    lg: 'h-12 text-sm pl-11 pr-10'
  }[inputSize];

  const iconSizes = {
    sm: 'w-3.5 h-3.5 left-2.5',
    md: 'w-4 h-4 left-3',
    lg: 'w-5 h-5 left-3.5'
  }[inputSize];

  return (
    <div className={`relative flex items-center w-full font-body ${className}`}>
      <Search
        className={`absolute ${iconSizes} text-[#94A3B8] dark:text-[#64748B] pointer-events-none`}
        aria-hidden="true"
      />

      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full ${sizeClasses} bg-[#F8FAF9] dark:bg-[#161A19] hover:bg-[#F1F5F4] dark:hover:bg-[#1F2423] border border-[#E2E8F0] dark:border-[#334155] focus:border-[#00695C] dark:focus:border-[#80D5C4] focus:bg-[#FFFFFF] dark:focus:bg-[#161A19] rounded-xl text-[#0F172A] dark:text-[#F1F5F9] placeholder-[#94A3B8] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#00695C]/20 transition-all shadow-2xs`}
        {...props}
      />

      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            if (onClear) onClear();
          }}
          aria-label="Clear search input"
          className="absolute right-2.5 w-6 h-6 flex items-center justify-center rounded-md text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : shortcut ? (
        <div className="absolute right-2.5 hidden sm:flex items-center pointer-events-none">
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#94A3B8] dark:text-[#64748B] bg-[#FFFFFF] dark:bg-[#1F2423] border border-[#E2E8F0] dark:border-[#334155] rounded shadow-2xs">
            {shortcut}
          </kbd>
        </div>
      ) : null}
    </div>
  );
};
