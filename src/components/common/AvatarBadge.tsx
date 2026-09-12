import React from 'react';
import { getAvatarColor, getInitials } from '../../utils/avatarColors';

interface AvatarBadgeProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showName?: boolean;
  role?: string;
  className?: string;
}

export const AvatarBadge: React.FC<AvatarBadgeProps> = ({
  name,
  size = 'sm',
  showName = false,
  role,
  className = ''
}) => {
  const initials = getInitials(name);
  const color = getAvatarColor(name);

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm font-bold'
  };

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold font-mono shadow-2xs border ${color.bg} ${color.text} ${color.border} shrink-0`}
        title={`${name}${role ? ` (${role})` : ''}`}
        aria-label={showName ? undefined : `${name}${role ? ` (${role})` : ''}`}
        aria-hidden={showName ? true : undefined}
      >
        {initials}
      </div>
      {showName && (
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{name}</p>
          {role && <p className="text-[10px] text-slate-500 truncate">{role}</p>}
        </div>
      )}
    </div>
  );
};
