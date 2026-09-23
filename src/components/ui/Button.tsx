import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tonal'
  | 'outline'
  | 'destructive'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon-sm' | 'icon-md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium font-body transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] dark:focus-visible:ring-[#80D5C4] focus-visible:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-[#00695C] hover:bg-[#005449] text-white shadow-xs dark:bg-[#80D5C4] dark:hover:bg-[#68c5b3] dark:text-[#003830]',
      secondary:
        'bg-[#F1F5F4] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#E2E8F0] dark:bg-[#1E293B] dark:hover:bg-[#334155] dark:text-[#F1F5F9] dark:border-[#334155]',
      tonal:
        'bg-[#CCE8E1] hover:bg-[#b4ded5] text-[#00201B] dark:bg-[#004F46] dark:hover:bg-[#006155] dark:text-[#A3F2E4]',
      outline:
        'bg-transparent hover:bg-[#F8FAF9] text-[#0F172A] border border-[#E2E8F0] dark:border-[#334155] dark:text-[#F1F5F9] dark:hover:bg-[#161A19]',
      destructive:
        'bg-[#BA1A1A] hover:bg-[#991515] text-white shadow-xs dark:bg-[#FFB4AB] dark:hover:bg-[#ffa095] dark:text-[#690005]',
      ghost:
        'bg-transparent hover:bg-[#F1F5F4] text-[#475569] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-[#1E293B] dark:hover:text-[#F1F5F9]'
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-xs rounded-lg gap-1.5 min-w-[32px]',
      md: 'h-10 px-4 text-sm rounded-xl gap-2 min-w-[40px]',
      lg: 'h-12 px-5 text-base rounded-xl gap-2.5 min-w-[48px]',
      'icon-sm': 'h-8 w-8 rounded-lg p-0',
      'icon-md': 'h-10 w-10 rounded-xl p-0 min-h-[44px] min-w-[44px]'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
