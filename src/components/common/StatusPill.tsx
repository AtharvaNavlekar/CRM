import React from 'react';

interface StatusPillProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  className = '',
  size = 'sm'
}) => {
  const norm = (status || '').toLowerCase().trim();

  // Consistent semantic status colors:
  // - amber/orange = "Upcoming/Pending" / "Call Back Later" / "Webinar Scheduled"
  // - red = "Late/Missed" / "Lost" / "RNR" / "Cancel"
  // - green = "Done/Connected/Won" / "Payment Done" / "Relevant"
  // - gray = "neutral/default" / "Fresh Lead" / "Reheated" / "Recorded Demo Sent"

  let badgeStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

  if (
    norm.includes('upcoming') ||
    norm.includes('pending') ||
    norm.includes('call back') ||
    norm.includes('webinar scheduled') ||
    norm.includes('1-to-1 demo scheduled') ||
    norm.includes('follow')
  ) {
    badgeStyle = 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60';
  } else if (
    norm.includes('late') ||
    norm.includes('missed') ||
    norm.includes('lost') ||
    norm.includes('rnr') ||
    norm.includes('cancel') ||
    norm.includes('dropped') ||
    norm.includes('not interested')
  ) {
    badgeStyle = 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60';
  } else if (
    norm.includes('won') ||
    norm.includes('done') ||
    norm.includes('connected') ||
    norm.includes('converted') ||
    norm.includes('webinar done') ||
    norm.includes('relevant')
  ) {
    badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60';
  } else if (norm.includes('fresh') || norm.includes('new')) {
    badgeStyle = 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60';
  } else if (norm.includes('reheated') || norm.includes('quotation') || norm.includes('negotiation')) {
    badgeStyle = 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60';
  } else if (norm.includes('demo sent')) {
    badgeStyle = 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md border tracking-tight whitespace-nowrap ${sizeClasses} ${badgeStyle} ${className}`}
    >
      {status}
    </span>
  );
};
