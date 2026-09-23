import React from 'react';

export type StatusTone = 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'primary';

export interface StatusBadgeProps {
  status: string;
  tone?: StatusTone;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Maps arbitrary status strings into standard semantic tones:
 * - SUCCESS / ACTIVE / ONLINE / WON / DONE -> success
 * - WARNING / PENDING / FOLLOW-UP / UPCOMING -> warning
 * - ERROR / FAILED / BLOCKED / LOST / RNR / CANCEL -> error
 * - INFO / FRESH / NEW -> info
 * - NEUTRAL / DRAFT / INACTIVE -> neutral
 */
export function getStatusTone(statusStr: string): StatusTone {
  const norm = (statusStr || '').toLowerCase().trim();
  if (
    norm.includes('won') ||
    norm.includes('done') ||
    norm.includes('connected') ||
    norm.includes('active') ||
    norm.includes('online') ||
    norm.includes('converted') ||
    norm.includes('relevant')
  ) {
    return 'success';
  }
  if (
    norm.includes('pending') ||
    norm.includes('follow') ||
    norm.includes('call back') ||
    norm.includes('upcoming') ||
    norm.includes('scheduled') ||
    norm.includes('warning')
  ) {
    return 'warning';
  }
  if (
    norm.includes('lost') ||
    norm.includes('failed') ||
    norm.includes('blocked') ||
    norm.includes('rnr') ||
    norm.includes('cancel') ||
    norm.includes('late') ||
    norm.includes('error') ||
    norm.includes('dropped')
  ) {
    return 'error';
  }
  if (
    norm.includes('fresh') ||
    norm.includes('new') ||
    norm.includes('quotation') ||
    norm.includes('negotiation')
  ) {
    return 'info';
  }
  return 'neutral';
}

const toneStyles: Record<
  StatusTone,
  {
    container: string;
    dot: string;
    text: string;
  }
> = {
  success: {
    container: 'bg-[#D1FAE5]/60 text-[#065F46] border-[#A7F3D0] dark:bg-[#064E3B]/40 dark:text-[#6EE7B7] dark:border-[#065F46]',
    dot: 'bg-[#10B981]',
    text: 'text-[#065F46] dark:text-[#6EE7B7]'
  },
  warning: {
    container: 'bg-[#FEF3C7]/70 text-[#92400E] border-[#FDE68A] dark:bg-[#78350F]/30 dark:text-[#FCD34D] dark:border-[#92400E]',
    dot: 'bg-[#F59E0B]',
    text: 'text-[#92400E] dark:text-[#FCD34D]'
  },
  error: {
    container: 'bg-[#FEE2E2]/70 text-[#991B1B] border-[#FECACA] dark:bg-[#7F1D1D]/30 dark:text-[#FCA5A5] dark:border-[#991B1B]',
    dot: 'bg-[#EF4444]',
    text: 'text-[#991B1B] dark:text-[#FCA5A5]'
  },
  info: {
    container: 'bg-[#E0F2FE]/70 text-[#0369A1] border-[#BAE6FD] dark:bg-[#0C4A6E]/30 dark:text-[#7DD3FC] dark:border-[#0369A1]',
    dot: 'bg-[#0284C7]',
    text: 'text-[#0369A1] dark:text-[#7DD3FC]'
  },
  primary: {
    container: 'bg-[#CCE8E1]/80 text-[#00201B] border-[#80D5C4]/40 dark:bg-[#004F46]/50 dark:text-[#A3F2E4] dark:border-[#00695C]',
    dot: 'bg-[#00695C] dark:bg-[#80D5C4]',
    text: 'text-[#00201B] dark:text-[#A3F2E4]'
  },
  neutral: {
    container: 'bg-[#F1F5F4] text-[#475569] border-[#E2E8F0] dark:bg-[#1E293B] dark:text-[#94A3B8] dark:border-[#334155]',
    dot: 'bg-[#94A3B8]',
    text: 'text-[#475569] dark:text-[#94A3B8]'
  }
};

/**
 * StatusBadge adheres to DialPulse calm surface and Zero-Pill discipline:
 * uses subtle tonal framing with a semantic dot indicator rather than screaming candy capsules.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  tone,
  showDot = true,
  size = 'sm',
  className = ''
}) => {
  const resolvedTone = tone || getStatusTone(status);
  const styles = toneStyles[resolvedTone];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-md font-body leading-none ${styles.container} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{status}</span>
    </span>
  );
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = ''
}) => {
  const styles = toneStyles[variant];
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-md font-body ${styles.container} ${sizeClasses} ${className}`}
    >
      {children}
    </span>
  );
};
