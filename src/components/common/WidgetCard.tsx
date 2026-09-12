import React, { useState } from 'react';
import { RefreshCw, Maximize2, Minimize2, Search } from 'lucide-react';

export type TimeRange = 'Today' | 'Yesterday' | 'This week' | 'This month' | 'This quarter' | 'All time';

interface WidgetCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  timeRanges?: TimeRange[];
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  onRefresh?: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const WidgetCard: React.FC<WidgetCardProps> = ({
  title,
  subtitle,
  badge,
  timeRange = 'This month',
  onTimeRangeChange,
  timeRanges = ['Today', 'Yesterday', 'This week', 'This month', 'This quarter'],
  showSearch = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  onRefresh,
  headerAction,
  children,
  className = ''
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>(timeRange);
  const [lastRefreshedSecs, setLastRefreshedSecs] = useState<number>(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRangeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as TimeRange;
    setSelectedRange(val);
    if (onTimeRangeChange) onTimeRangeChange(val);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setLastRefreshedSecs(0);
    if (onRefresh) onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const formattedRefreshed =
    lastRefreshedSecs === 0
      ? 'Just now'
      : lastRefreshedSecs < 60
      ? `${lastRefreshedSecs}s ago`
      : `${Math.floor(lastRefreshedSecs / 60)}m ago`;

  const cardContent = (
    <div
      className={`bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[24px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-xs flex flex-col overflow-hidden transition-all duration-200 ${className} ${
        isExpanded ? 'fixed inset-4 z-50 shadow-2xl p-4' : ''
      }`}
    >
      {/* Header Chrome */}
      <div className="px-4 py-3.5 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex flex-wrap items-center justify-between gap-2.5 bg-[#ECEFEC]/60 dark:bg-[#1D201F]/60">
        <div className="flex items-center space-x-2.5 min-w-0">
          <h3 className="text-xs font-semibold text-[#191C1B] dark:text-[#E1E3E0] m3-title-small truncate">
            {title}
          </h3>
          {badge && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#CCE8E1] text-[#00201B] dark:bg-[#004F46] dark:text-[#80D5C4]">
              {badge}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-[#6F7976] hidden sm:inline truncate">• {subtitle}</span>
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Inline search if enabled */}
          {showSearch && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6F7976] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                aria-label={`Search within ${title}`}
                value={searchValue}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                className="w-28 sm:w-36 pl-7 pr-2.5 py-1.5 text-xs rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] border border-transparent text-[#191C1B] dark:text-[#E1E3E0] placeholder-[#6F7976] focus:outline-none focus:ring-2 focus:ring-[#00695C] transition-all"
              />
            </div>
          )}

          {headerAction}

          {/* Time-range filter dropdown */}
          <select
            value={selectedRange}
            onChange={handleRangeSelect}
            aria-label={`Time range filter for ${title}`}
            className="text-xs font-medium rounded-full px-3 py-1.5 m3-select"
          >
            {timeRanges.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Last refreshed timestamp + manual refresh icon */}
          <div className="flex items-center space-x-1 pl-1 text-[10px] text-[#6F7976]">
            <span className="hidden md:inline tabular-nums">{formattedRefreshed}</span>
            <button
              type="button"
              onClick={handleManualRefresh}
              aria-label={`Refresh data for ${title}`}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] text-[#6F7976] hover:text-[#191C1B] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-colors"
              title="Refresh widget data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00695C] dark:text-[#80D5C4]' : ''}`} />
            </button>
          </div>

          {/* Fullscreen Expand Icon */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title} full screen`}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] text-[#6F7976] hover:text-[#191C1B] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand full screen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Widget Content Body */}
      <div className={`p-4 flex-1 overflow-auto ${isExpanded ? 'max-h-[calc(100vh-140px)]' : ''}`}>
        {children}
      </div>
    </div>
  );

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
      {cardContent}
    </>
  );
};
