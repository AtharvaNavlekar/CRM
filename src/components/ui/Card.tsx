import React from 'react';

export type CardElevation = 'flat' | 'surface' | 'interactive' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ elevation = 'surface', noPadding = false, className = '', children, ...props }, ref) => {
    const elevationClasses: Record<CardElevation, string> = {
      flat: 'bg-transparent border-none shadow-none',
      surface:
        'bg-[#FFFFFF] dark:bg-[#161A19] border border-[#E2E8F0] dark:border-[#334155] shadow-2xs rounded-2xl',
      interactive:
        'bg-[#FFFFFF] dark:bg-[#161A19] border border-[#E2E8F0] dark:border-[#334155] hover:border-[#00695C]/60 dark:hover:border-[#80D5C4]/60 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer rounded-2xl',
      elevated:
        'bg-[#FFFFFF] dark:bg-[#161A19] border border-[#E2E8F0] dark:border-[#334155] shadow-sm dark:shadow-black/40 rounded-2xl'
    };

    return (
      <div
        ref={ref}
        className={`${elevationClasses[elevation]} ${noPadding ? '' : 'p-5'} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`flex items-center justify-between pb-3 border-b border-[#F1F5F4] dark:border-[#202726] ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-base font-semibold font-heading text-[#0F172A] dark:text-[#F1F5F9] tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-body mt-0.5" {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => <div className={`pt-3 ${className}`} {...props}>{children}</div>;

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`pt-3 mt-3 border-t border-[#F1F5F4] dark:border-[#202726] flex items-center justify-between ${className}`} {...props}>
    {children}
  </div>
);
