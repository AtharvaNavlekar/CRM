import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col space-y-1.5 font-body">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[#475569] dark:text-[#94A3B8] tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[#94A3B8] dark:text-[#64748B]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`w-full h-10 px-3 ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} bg-[#FFFFFF] dark:bg-[#161A19] border ${
              error
                ? 'border-[#BA1A1A] focus:ring-[#BA1A1A]/20'
                : 'border-[#E2E8F0] dark:border-[#334155] focus:border-[#00695C] dark:focus:border-[#80D5C4] focus:ring-[#00695C]/20'
            } rounded-xl text-sm text-[#0F172A] dark:text-[#F1F5F9] placeholder-[#94A3B8] dark:placeholder-[#64748B] focus:outline-none focus:ring-2 transition-all shadow-2xs disabled:bg-[#F1F5F4] dark:disabled:bg-[#1F2423] disabled:text-[#94A3B8] ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-[#94A3B8] dark:text-[#64748B]">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p id={`${inputId}-error`} className="text-xs font-medium text-[#BA1A1A] dark:text-[#FFB4AB] mt-0.5">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
