import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className = '', id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full flex flex-col space-y-1.5 font-body">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8] tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            className={`appearance-none w-full h-10 pl-3 pr-9 bg-[#FFFFFF] dark:bg-[#161A19] border ${
              error
                ? 'border-[#BA1A1A] focus:ring-[#BA1A1A]/20'
                : 'border-[#E2E8F0] dark:border-[#334155] focus:border-[#00695C] dark:focus:border-[#80D5C4] focus:ring-[#00695C]/20'
            } rounded-xl text-sm text-[#0F172A] dark:text-[#F1F5F9] focus:outline-none focus:ring-2 transition-all shadow-2xs cursor-pointer disabled:bg-[#F1F5F4] dark:disabled:bg-[#1F2423] disabled:text-[#94A3B8] ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="bg-[#FFFFFF] dark:bg-[#161A19] text-[#0F172A] dark:text-[#F1F5F9]"
              >
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown
            className="w-4 h-4 text-[#94A3B8] dark:text-[#64748B] absolute right-3 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {error ? (
          <p className="text-xs font-medium text-[#BA1A1A] dark:text-[#FFB4AB] mt-0.5">
            {error}
          </p>
        ) : helperText ? (
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
