import React from 'react';

/**
 * Base Material Design 3 Skeleton Shimmer Component
 */
export const SkeletonBox: React.FC<{
  className?: string;
  rounded?: string;
}> = ({ className = '', rounded = 'rounded-2xl' }) => (
  <div
    className={`bg-[#E0E4E0]/70 dark:bg-[#272B2A]/70 animate-pulse ${rounded} ${className}`}
    aria-hidden="true"
  />
);

/**
 * M3 Skeleton for Leads Table View
 */
export const LeadsTableSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF8] dark:bg-[#111413] overflow-hidden select-none">
      {/* Top Toolbar Skeleton */}
      <div className="p-4 bg-[#F8FAF8] dark:bg-[#111413] border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 space-y-3 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search bar skeleton */}
          <div className="flex items-center space-x-2 flex-1 max-w-lg">
            <SkeletonBox className="h-11 w-full" rounded="rounded-full" />
          </div>

          {/* Action buttons skeleton */}
          <div className="flex items-center space-x-2.5">
            <SkeletonBox className="h-11 w-28" rounded="rounded-full" />
            <SkeletonBox className="h-11 w-36" rounded="rounded-full" />
            <SkeletonBox className="h-11 w-11" rounded="rounded-full" />
          </div>
        </div>

        {/* Filter chips skeleton */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1">
          <SkeletonBox className="h-8 w-20 shrink-0" rounded="rounded-full" />
          <SkeletonBox className="h-8 w-24 shrink-0" rounded="rounded-full" />
          <SkeletonBox className="h-8 w-28 shrink-0" rounded="rounded-full" />
          <SkeletonBox className="h-8 w-24 shrink-0" rounded="rounded-full" />
          <SkeletonBox className="h-8 w-32 shrink-0" rounded="rounded-full" />
        </div>
      </div>

      {/* Table Rows Skeleton */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {/* Table header bar */}
        <div className="h-10 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl flex items-center px-4 space-x-4 mb-3 shrink-0">
          <SkeletonBox className="h-4 w-4" rounded="rounded-sm" />
          <SkeletonBox className="h-4 w-32" rounded="rounded-full" />
          <SkeletonBox className="h-4 w-20 hidden md:block" rounded="rounded-full" />
          <SkeletonBox className="h-4 w-16 hidden lg:block" rounded="rounded-full" />
          <SkeletonBox className="h-4 w-28 hidden sm:block" rounded="rounded-full" />
          <SkeletonBox className="h-4 w-20 ml-auto" rounded="rounded-full" />
        </div>

        {/* 8 Table Data Rows */}
        <div className="space-y-2 flex-1 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white dark:bg-[#191C1B] rounded-2xl border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 px-4 flex items-center space-x-4"
              style={{ opacity: 1 - i * 0.08 }}
            >
              <SkeletonBox className="h-4 w-4 shrink-0" rounded="rounded-sm" />
              <div className="flex items-center space-x-3 min-w-[200px] flex-1 sm:flex-none">
                <SkeletonBox className="h-9 w-9 shrink-0" rounded="rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <SkeletonBox className="h-3.5 w-28" rounded="rounded-full" />
                  <SkeletonBox className="h-2.5 w-20" rounded="rounded-full" />
                </div>
              </div>
              <SkeletonBox className="h-6 w-20 shrink-0 hidden md:block" rounded="rounded-full" />
              <SkeletonBox className="h-4 w-16 shrink-0 hidden lg:block" rounded="rounded-full" />
              <SkeletonBox className="h-6 w-24 shrink-0 hidden sm:block" rounded="rounded-full" />
              <div className="ml-auto flex items-center space-x-2">
                <SkeletonBox className="h-8 w-8 shrink-0" rounded="rounded-full" />
                <SkeletonBox className="h-8 w-8 shrink-0" rounded="rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * M3 Skeleton for Calls Console View
 */
export const CallsViewSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF8] dark:bg-[#111413] p-4 lg:p-6 overflow-hidden space-y-4 select-none">
      {/* KPI Cards Row Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 shrink-0">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-3xl bg-white dark:bg-[#191C1B] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 space-y-2"
          >
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-3.5 w-20" rounded="rounded-full" />
              <SkeletonBox className="h-7 w-7" rounded="rounded-full" />
            </div>
            <SkeletonBox className="h-7 w-16" rounded="rounded-lg" />
            <SkeletonBox className="h-2.5 w-24" rounded="rounded-full" />
          </div>
        ))}
      </div>

      {/* Callback Alert Banner Skeleton */}
      <div className="p-3.5 rounded-3xl bg-[#ECEFEC] dark:bg-[#1D201F] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <SkeletonBox className="h-8 w-8" rounded="rounded-full" />
          <div className="space-y-1.5">
            <SkeletonBox className="h-3.5 w-32" rounded="rounded-full" />
            <SkeletonBox className="h-2.5 w-48" rounded="rounded-full" />
          </div>
        </div>
        <SkeletonBox className="h-9 w-24" rounded="rounded-full" />
      </div>

      {/* Calls List Skeleton */}
      <div className="flex-1 bg-white dark:bg-[#191C1B] rounded-3xl border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 p-4 flex flex-col overflow-hidden space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 shrink-0">
          <SkeletonBox className="h-5 w-36" rounded="rounded-full" />
          <SkeletonBox className="h-9 w-64" rounded="rounded-full" />
        </div>

        <div className="space-y-2.5 flex-1 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-[#F8FAF8] dark:bg-[#202322] border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between space-x-4"
              style={{ opacity: 1 - i * 0.12 }}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <SkeletonBox className="h-10 w-10 shrink-0" rounded="rounded-full" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <SkeletonBox className="h-4 w-32" rounded="rounded-full" />
                  <SkeletonBox className="h-3 w-48" rounded="rounded-full" />
                </div>
              </div>
              <SkeletonBox className="h-6 w-20 shrink-0" rounded="rounded-full" />
              <SkeletonBox className="h-8 w-24 shrink-0 hidden sm:block" rounded="rounded-full" />
              <SkeletonBox className="h-9 w-9 shrink-0" rounded="rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * M3 Skeleton for Kanban Pipeline View
 */
export const KanbanBoardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF8] dark:bg-[#111413] p-4 lg:p-6 overflow-hidden space-y-4 select-none">
      {/* Header controls skeleton */}
      <div className="flex items-center justify-between shrink-0">
        <div className="space-y-1">
          <SkeletonBox className="h-6 w-44" rounded="rounded-full" />
          <SkeletonBox className="h-3 w-64" rounded="rounded-full" />
        </div>
        <div className="flex items-center space-x-2">
          <SkeletonBox className="h-10 w-32" rounded="rounded-full" />
          <SkeletonBox className="h-10 w-10" rounded="rounded-full" />
        </div>
      </div>

      {/* 5 Column Stage Skeletons */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-hidden">
        {[...Array(5)].map((_, colIndex) => (
          <div
            key={colIndex}
            className="flex flex-col bg-[#ECEFEC]/60 dark:bg-[#1D201F]/60 rounded-3xl p-3 border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 overflow-hidden space-y-3"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 shrink-0">
              <div className="flex items-center space-x-2">
                <SkeletonBox className="h-3 w-3" rounded="rounded-full" />
                <SkeletonBox className="h-4 w-20" rounded="rounded-full" />
              </div>
              <SkeletonBox className="h-5 w-6" rounded="rounded-full" />
            </div>

            {/* Lead Cards per Column */}
            <div className="space-y-2.5 flex-1 overflow-hidden">
              {[...Array(3)].map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="p-3.5 rounded-2xl bg-white dark:bg-[#191C1B] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 space-y-2.5 shadow-xs"
                  style={{ opacity: 1 - cardIndex * 0.18 }}
                >
                  <div className="flex items-center justify-between">
                    <SkeletonBox className="h-3 w-14" rounded="rounded-full" />
                    <SkeletonBox className="h-4 w-12" rounded="rounded-full" />
                  </div>
                  <SkeletonBox className="h-4 w-28" rounded="rounded-full" />
                  <SkeletonBox className="h-3 w-20" rounded="rounded-full" />
                  <div className="flex items-center justify-between pt-1 border-t border-[#BEC9C5]/20 dark:border-[#3F4946]/20">
                    <SkeletonBox className="h-6 w-6" rounded="rounded-full" />
                    <SkeletonBox className="h-4 w-16" rounded="rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
