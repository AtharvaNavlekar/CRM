import React, { useState, useMemo } from 'react';
import {
  MOCK_ACTIVITY_PERFORMANCE,
  MOCK_FOLLOW_UPS,
  MOCK_SAVED_FILTERS,
  PIPELINE_STAGES,
  PIPELINE_STAGE_COLORS,
  SavedFilterItem,
  MockLead
} from '../../data/mockSeedData';
import { WidgetCard, TimeRange } from '../common/WidgetCard';
import { AvatarBadge } from '../common/AvatarBadge';
import { Settings, Plus, ExternalLink, Filter, BarChart3, Clock } from 'lucide-react';

interface DashboardViewProps {
  leads: MockLead[];
  onNavigateToLeadsFilter?: (filterName: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads,
  onNavigateToLeadsFilter
}) => {
  // Widget 1: Activity & Performance State
  const [activitySearch, setActivitySearch] = useState('');
  const [activityRange, setActivityRange] = useState<TimeRange>('This month');

  // Widget 2: Follow Ups State
  const [followUpSearch, setFollowUpSearch] = useState('');
  const [followUpRange, setFollowUpRange] = useState<TimeRange>('This month');

  // Widget 3: Filter(s) State
  const [savedFilters, setSavedFilters] = useState<SavedFilterItem[]>(MOCK_SAVED_FILTERS);
  const [isManageFilterModalOpen, setIsManageFilterModalOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterDesc, setNewFilterDesc] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // Widget 4: All Leads Bar Chart State
  const [pipelineRange, setPipelineRange] = useState<TimeRange>('This month');

  // Activity calculation with multiplier based on timeRange
  const activityMultiplier = useMemo(() => {
    switch (activityRange) {
      case 'Today': return 0.2;
      case 'Yesterday': return 0.18;
      case 'This week': return 0.45;
      case 'This quarter': return 2.8;
      default: return 1.0;
    }
  }, [activityRange]);

  const filteredActivityRows = useMemo(() => {
    return MOCK_ACTIVITY_PERFORMANCE.filter((r) =>
      r.assignee.toLowerCase().includes(activitySearch.toLowerCase())
    ).map((r) => {
      const calls = Math.round(r.calls * activityMultiplier);
      const mins = Math.round(r.durationMinutes * activityMultiplier);
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      const rev = Math.round(r.revenue * activityMultiplier);
      const revFormatted = rev >= 100000 ? `₹ ${(rev / 100000).toFixed(1)} L` : `₹ ${rev.toLocaleString('en-IN')}`;
      return {
        ...r,
        calls,
        durationFormatted: `${hours}h ${remMins.toString().padStart(2, '0')}m`,
        revenue: rev,
        revenueFormatted: revFormatted
      };
    });
  }, [activitySearch, activityMultiplier]);

  // Activity Totals
  const activityTotals = useMemo(() => {
    const totalCalls = filteredActivityRows.reduce((acc, r) => acc + r.calls, 0);
    const totalRevenue = filteredActivityRows.reduce((acc, r) => acc + r.revenue, 0);
    return {
      calls: totalCalls,
      revenueFormatted: totalRevenue >= 100000 ? `₹ ${(totalRevenue / 100000).toFixed(1)} L` : `₹ ${totalRevenue.toLocaleString('en-IN')}`
    };
  }, [filteredActivityRows]);

  // Follow Ups filtered rows
  const followUpMultiplier = useMemo(() => {
    switch (followUpRange) {
      case 'Today': return 0.25;
      case 'Yesterday': return 0.2;
      case 'This week': return 0.5;
      case 'This quarter': return 2.5;
      default: return 1.0;
    }
  }, [followUpRange]);

  const filteredFollowUpRows = useMemo(() => {
    return MOCK_FOLLOW_UPS.filter((r) =>
      r.assignee.toLowerCase().includes(followUpSearch.toLowerCase())
    ).map((r) => {
      const upcoming = Math.round(r.upcoming * followUpMultiplier);
      const late = Math.round(r.late * followUpMultiplier);
      const done = Math.round(r.done * followUpMultiplier);
      const cancel = Math.round(r.cancel * followUpMultiplier);
      return {
        ...r,
        upcoming,
        late,
        done,
        cancel,
        total: upcoming + late + done + cancel
      };
    });
  }, [followUpSearch, followUpMultiplier]);

  // Follow Up Totals
  const followUpTotals = useMemo(() => {
    return filteredFollowUpRows.reduce(
      (acc, r) => ({
        upcoming: acc.upcoming + r.upcoming,
        late: acc.late + r.late,
        done: acc.done + r.done,
        cancel: acc.cancel + r.cancel,
        total: acc.total + r.total
      }),
      { upcoming: 0, late: 0, done: 0, cancel: 0, total: 0 }
    );
  }, [filteredFollowUpRows]);

  // Filter list search
  const visibleSavedFilters = useMemo(() => {
    if (!filterSearch.trim()) return savedFilters;
    return savedFilters.filter((f) =>
      f.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      f.description.toLowerCase().includes(filterSearch.toLowerCase())
    );
  }, [savedFilters, filterSearch]);

  // Pipeline stages distribution calculation
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach((st) => (counts[st] = 0));

    leads.forEach((l) => {
      if (counts[l.status] !== undefined) {
        counts[l.status]++;
      } else {
        counts[l.status] = 1;
      }
    });

    return counts;
  }, [leads]);

  const maxStageCount = useMemo(() => {
    const vals = Object.values(stageCounts) as number[];
    return Math.max(...vals, 1);
  }, [stageCounts]);

  const handleAddCustomFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;
    const item: SavedFilterItem = {
      id: `f-${Date.now()}`,
      name: newFilterName.trim(),
      description: newFilterDesc.trim() || 'Custom sales segment filter',
      fresh: Math.floor(Math.random() * 15) + 5,
      active: Math.floor(Math.random() * 30) + 12,
      won: Math.floor(Math.random() * 12) + 2,
      lost: Math.floor(Math.random() * 8) + 1
    };
    setSavedFilters([item, ...savedFilters]);
    setNewFilterName('');
    setNewFilterDesc('');
    setIsManageFilterModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF8] dark:bg-[#111413] overflow-y-auto p-4 space-y-4">
      {/* Top Banner Context */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
        <div>
          <h1 className="text-base font-semibold text-[#191C1B] dark:text-[#E1E3E0] tracking-tight flex items-center space-x-2 m3-title-medium">
            <BarChart3 className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
            <span>Executive Dashboard &amp; Real-Time Operations</span>
          </h1>
          <p className="text-xs text-[#6F7976] m3-body-small font-normal">
            2x2 dense live operational grid • Independent time frames &amp; manual refresh counters
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#CCE8E1] text-[#00201B] dark:bg-[#004F46] dark:text-[#80D5C4] font-medium border border-transparent">
            <span className="w-2 h-2 rounded-full bg-[#00695C] dark:bg-[#80D5C4] animate-pulse"></span>
            <span>Live Sync Engine Active</span>
          </span>
        </div>
      </div>

      {/* 2x2 Grid of Independently Configurable Widget Cards — stacks to 1-col on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 pb-20 lg:pb-0">
        {/* Widget 1: Activity & Performance */}
        <WidgetCard
          title="Activity & Performance"
          subtitle="Telesales calls, duration & revenue"
          timeRange={activityRange}
          onTimeRangeChange={(r) => setActivityRange(r)}
          showSearch={true}
          searchValue={activitySearch}
          onSearchChange={setActivitySearch}
          searchPlaceholder="Filter rep..."
          className="min-h-[380px]"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[11px] font-medium text-[#6F7976] border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 uppercase tracking-wider">
                  <th className="pb-2.5">Assignee</th>
                  <th className="pb-2.5 text-right">Calls</th>
                  <th className="pb-2.5 text-right">Duration</th>
                  <th className="pb-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BEC9C5]/20 dark:divide-[#3F4946]/20 font-medium">
                {filteredActivityRows.map((row) => (
                  <tr key={row.assignee} className="hover:bg-[#ECEFEC]/60 dark:hover:bg-[#272B2A]/60 transition-colors">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center space-x-2.5">
                        <AvatarBadge name={row.assignee} size="xs" />
                        <span className="font-medium text-[#191C1B] dark:text-[#E1E3E0] truncate max-w-[140px]">
                          {row.assignee}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono text-[#191C1B] dark:text-[#E1E3E0] font-semibold">
                      {row.calls}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[#6F7976]">
                      {row.durationFormatted}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[#00695C] dark:text-[#80D5C4] font-semibold">
                      {row.revenueFormatted}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Total Row */}
              <tfoot>
                <tr className="border-t border-[#BEC9C5]/40 dark:border-[#3F4946]/40 bg-[#ECEFEC]/50 dark:bg-[#1D201F] font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
                  <td className="py-2.5 px-2 uppercase tracking-wide text-[11px]">Total</td>
                  <td className="py-2.5 text-right font-mono">{activityTotals.calls}</td>
                  <td className="py-2.5 text-right font-mono text-[#6F7976]">—</td>
                  <td className="py-2.5 text-right font-mono text-[#00695C] dark:text-[#80D5C4]">
                    {activityTotals.revenueFormatted}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </WidgetCard>

        {/* Widget 2: Follow Ups */}
        <WidgetCard
          title="Follow Ups"
          subtitle="Upcoming, Late, Done & Cancelled callbacks"
          timeRange={followUpRange}
          onTimeRangeChange={(r) => setFollowUpRange(r)}
          showSearch={true}
          searchValue={followUpSearch}
          onSearchChange={setFollowUpSearch}
          searchPlaceholder="Filter rep..."
          className="min-h-[380px]"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[11px] font-medium text-[#6F7976] border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 uppercase tracking-wider">
                  <th className="pb-2.5">Assignee</th>
                  <th className="pb-2.5 text-center text-amber-700 dark:text-amber-300">Upcoming</th>
                  <th className="pb-2.5 text-center text-[#BA1A1A] dark:text-[#FFB4AB]">Late</th>
                  <th className="pb-2.5 text-center text-[#00695C] dark:text-[#80D5C4]">Done</th>
                  <th className="pb-2.5 text-center text-[#6F7976]">Cancel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#BEC9C5]/20 dark:divide-[#3F4946]/20 font-medium">
                {filteredFollowUpRows.map((row) => (
                  <tr key={row.assignee} className="hover:bg-[#ECEFEC]/60 dark:hover:bg-[#272B2A]/60 transition-colors">
                    <td className="py-2.5 pr-2">
                      <div className="flex items-center space-x-2.5">
                        <AvatarBadge name={row.assignee} size="xs" />
                        <span className="font-medium text-[#191C1B] dark:text-[#E1E3E0] truncate max-w-[130px]">
                          {row.assignee}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-mono font-semibold text-amber-700 dark:text-amber-300">
                      {row.upcoming}
                    </td>
                    <td className="py-2.5 text-center font-mono font-semibold text-[#BA1A1A] dark:text-[#FFB4AB]">
                      {row.late}
                    </td>
                    <td className="py-2.5 text-center font-mono font-semibold text-[#00695C] dark:text-[#80D5C4]">
                      {row.done}
                    </td>
                    <td className="py-2.5 text-center font-mono text-[#6F7976]">
                      {row.cancel}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Total Row */}
              <tfoot>
                <tr className="border-t border-[#BEC9C5]/40 dark:border-[#3F4946]/40 bg-[#ECEFEC]/50 dark:bg-[#1D201F] font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
                  <td className="py-2.5 px-2 uppercase tracking-wide text-[11px]">Total</td>
                  <td className="py-2.5 text-center font-mono text-amber-700 dark:text-amber-300">
                    {followUpTotals.upcoming}
                  </td>
                  <td className="py-2.5 text-center font-mono text-[#BA1A1A] dark:text-[#FFB4AB]">
                    {followUpTotals.late}
                  </td>
                  <td className="py-2.5 text-center font-mono text-[#00695C] dark:text-[#80D5C4]">
                    {followUpTotals.done}
                  </td>
                  <td className="py-2.5 text-center font-mono text-[#6F7976]">
                    {followUpTotals.cancel}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </WidgetCard>

        {/* Widget 3: Filter(s) */}
        <WidgetCard
          title="Filter(s)"
          subtitle="Saved custom telesales segments"
          showSearch={true}
          searchValue={filterSearch}
          onSearchChange={setFilterSearch}
          searchPlaceholder="Search saved filter..."
          headerAction={
            <button
              type="button"
              id="btn-manage-filters"
              onClick={() => setIsManageFilterModalOpen(true)}
              className="text-xs font-medium text-[#00695C] hover:bg-[#CCE8E1] dark:text-[#80D5C4] dark:hover:bg-[#004F46] flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-[#BEC9C5]/50 dark:border-[#3F4946]/50 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Manage</span>
            </button>
          }
          className="min-h-[380px]"
        >
          <div className="space-y-2.5">
            {visibleSavedFilters.map((f) => (
              <div
                key={f.id}
                onClick={() => onNavigateToLeadsFilter && onNavigateToLeadsFilter(f.name)}
                className="p-3.5 rounded-[16px] border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 bg-[#F8FAF8] dark:bg-[#272B2A] hover:border-[#00695C]/50 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                    <span className="font-medium text-xs text-[#191C1B] dark:text-[#E1E3E0] group-hover:text-[#00695C] transition-colors">
                      {f.name}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#6F7976] group-hover:text-[#191C1B] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-[#6F7976] mt-1 line-clamp-1">{f.description}</p>

                {/* Status Breakdown Pills */}
                <div className="grid grid-cols-4 gap-2 mt-2.5 pt-2 border-t border-[#BEC9C5]/20 dark:border-[#3F4946]/20 text-[11px] font-mono">
                  <div className="bg-[#EBF2F8] dark:bg-[#1E293B] border border-transparent rounded-full py-1 text-center">
                    <div className="text-[9px] uppercase font-bold text-sky-700 dark:text-sky-300">Fresh</div>
                    <div className="font-bold text-sky-900 dark:text-sky-100">{f.fresh}</div>
                  </div>
                  <div className="bg-[#EDEBF7] dark:bg-[#2E284A] border border-transparent rounded-full py-1 text-center">
                    <div className="text-[9px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Active</div>
                    <div className="font-bold text-indigo-900 dark:text-indigo-100">{f.active}</div>
                  </div>
                  <div className="bg-[#CCE8E1] dark:bg-[#004F46] border border-transparent rounded-full py-1 text-center">
                    <div className="text-[9px] uppercase font-bold text-[#00201B] dark:text-[#80D5C4]">Won</div>
                    <div className="font-bold text-[#00201B] dark:text-[#80D5C4]">{f.won}</div>
                  </div>
                  <div className="bg-[#FFDAD6] dark:bg-[#93000A] border border-transparent rounded-full py-1 text-center">
                    <div className="text-[9px] uppercase font-bold text-[#410002] dark:text-[#FFB4AB]">Lost</div>
                    <div className="font-bold text-[#410002] dark:text-[#FFB4AB]">{f.lost}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </WidgetCard>

        {/* Widget 4: All Leads Bar Chart */}
        <WidgetCard
          title="All Leads"
          subtitle="Pipeline stage distribution breakdown"
          badge={`Total Leads: ${leads.length}`}
          timeRange={pipelineRange}
          onTimeRangeChange={(r) => setPipelineRange(r)}
          className="min-h-[380px]"
        >
          <div className="flex flex-col h-full justify-between space-y-4">
            <div className="flex items-center justify-between text-xs font-medium text-[#6F7976] pb-1 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
              <span>Pipeline Stage ({PIPELINE_STAGES.length} Stages)</span>
              <span className="font-mono text-[#191C1B] dark:text-[#E1E3E0] font-semibold">
                Total Leads: {leads.length}
              </span>
            </div>

            {/* Custom High-Density Stage Bars */}
            <div className="space-y-3 overflow-y-auto max-h-[300px] pr-1">
              {PIPELINE_STAGES.map((stage) => {
                const count = stageCounts[stage] || 0;
                const percentage = Math.round((count / maxStageCount) * 100);
                const color = PIPELINE_STAGE_COLORS[stage] || '#00695C';

                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#191C1B] dark:text-[#E1E3E0] truncate max-w-[200px]">
                        {stage}
                      </span>
                      <span className="font-mono font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
                        {count} leads
                      </span>
                    </div>

                    <div className="h-3 w-full bg-[#ECEFEC] dark:bg-[#272B2A] rounded-full overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max(percentage, 4)}%`,
                          backgroundColor: color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </WidgetCard>
      </div>

      {/* Manage Custom Filters Modal */}
      {isManageFilterModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#00201B]/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[28px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 bg-[#ECEFEC]/70 dark:bg-[#272B2A]/70 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#191C1B] dark:text-[#E1E3E0] flex items-center space-x-2 m3-title-medium">
                <Settings className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                <span>Manage Saved Filters</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManageFilterModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6F7976] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] hover:text-[#191C1B] transition-colors"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomFilter} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-1.5">
                  New Filter Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Q3 High Budget NRI Investors"
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] border border-transparent text-[#191C1B] dark:text-[#E1E3E0] font-medium focus:outline-none focus:ring-2 focus:ring-[#00695C]"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-1.5">
                  Description / Rule
                </label>
                <input
                  type="text"
                  placeholder="e.g., Leads from Dubai & Singapore with budget > 1 Cr"
                  value={newFilterDesc}
                  onChange={(e) => setNewFilterDesc(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] border border-transparent text-[#191C1B] dark:text-[#E1E3E0] focus:outline-none focus:ring-2 focus:ring-[#00695C]"
                />
              </div>

              <div className="p-3.5 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60 border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 text-[11px] text-[#6F7976]">
                Custom filters allow sales reps to immediately isolate high-urgency buckets without recreating multi-field queries.
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManageFilterModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#BEC9C5]/50 dark:border-[#3F4946]/50 font-medium text-[#191C1B] dark:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors min-h-[40px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#00695C] text-white font-medium hover:bg-[#005449] flex items-center space-x-1.5 shadow-sm transition-colors min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Filter</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
