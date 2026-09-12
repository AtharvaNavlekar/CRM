import React from 'react';
import { Filter, X } from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { PIPELINE_STAGES, TEAM_MEMBERS } from '../../data/mockSeedData';

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  // Filter values
  stageFilter: string;
  assigneeFilter: string;
  sourceFilter: string;
  complianceFilter: string;
  dateFilter: string;
  // Available options
  availableSources: string[];
  // Setters
  onStageChange: (val: string) => void;
  onAssigneeChange: (val: string) => void;
  onSourceChange: (val: string) => void;
  onComplianceChange: (val: string) => void;
  onDateChange: (val: string) => void;
  onResetAll: () => void;
  activeFilterCount: number;
}

/**
 * MobileFilterSheet — Bottom sheet containing all lead filter controls.
 * 
 * On mobile, the filter chips row from the desktop toolbar is too wide 
 * to fit. Instead, a "Filters" button opens this bottom sheet with all
 * filter controls stacked vertically.
 */
export const MobileFilterSheet: React.FC<MobileFilterSheetProps> = ({
  isOpen,
  onClose,
  stageFilter,
  assigneeFilter,
  sourceFilter,
  complianceFilter,
  dateFilter,
  availableSources,
  onStageChange,
  onAssigneeChange,
  onSourceChange,
  onComplianceChange,
  onDateChange,
  onResetAll,
  activeFilterCount
}) => {
  const selectBaseClass =
    'w-full min-h-[48px] px-4 py-3 text-sm font-medium bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#00695C] transition-colors cursor-pointer appearance-none';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Filter Leads" maxHeightVh={80}>
      <div className="p-5 space-y-5">
        {/* Active filter count + reset */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#CCE8E1]/40 dark:bg-[#005046]/20 border border-[#00695C]/20">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
              <span className="text-xs font-medium text-[#00201B] dark:text-[#A3F2E4]">
                {activeFilterCount} active filter{activeFilterCount !== 1 ? 's' : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={onResetAll}
              className="text-xs font-medium text-[#00695C] dark:text-[#80D5C4] hover:underline min-h-[36px] px-3 rounded-full"
            >
              Reset All
            </button>
          </div>
        )}

        {/* Lead Stage */}
        <div>
          <label htmlFor="mobile-filter-stage" className="block text-xs font-medium text-[#6F7976] dark:text-[#89938F] mb-2 uppercase tracking-wider">
            Lead Stage
          </label>
          <select
            id="mobile-filter-stage"
            value={stageFilter}
            onChange={(e) => onStageChange(e.target.value)}
            className="m3-select"
          >
            <option value="all">All Stages ({PIPELINE_STAGES.length})</option>
            {PIPELINE_STAGES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {/* Assignee */}
        <div>
          <label htmlFor="mobile-filter-assignee" className="block text-xs font-medium dark:text-[#89938F] mb-2 uppercase tracking-wider m3-select">
            Assignee
          </label>
          <select
            id="mobile-filter-assignee"
            value={assigneeFilter}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="m3-select"
          >
            <option value="all">All Assignees</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Source */}
        <div>
          <label htmlFor="mobile-filter-source" className="block text-xs font-medium dark:text-[#89938F] mb-2 uppercase tracking-wider m3-select">
            Source
          </label>
          <select
            id="mobile-filter-source"
            value={sourceFilter}
            onChange={(e) => onSourceChange(e.target.value)}
            className="m3-select"
          >
            <option value="all">All Sources ({availableSources.length})</option>
            {availableSources.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>

        {/* Compliance */}
        <div>
          <label htmlFor="mobile-filter-compliance" className="block text-xs font-medium dark:text-[#89938F] mb-2 uppercase tracking-wider m3-select">
            Compliance
          </label>
          <select
            id="mobile-filter-compliance"
            value={complianceFilter}
            onChange={(e) => onComplianceChange(e.target.value)}
            className="m3-select"
          >
            <option value="all">All Leads</option>
            <option value="capped">🛑 Capped (3/3 Calls)</option>
            <option value="at_risk">⚠️ Near Cap (2/3 Calls)</option>
            <option value="whatsapp_only">💬 WhatsApp Only</option>
            <option value="paused_opted_out">⏸️ Paused / Opted-out</option>
          </select>
        </div>

        {/* Date Range */}
        <div>
          <label htmlFor="mobile-filter-date" className="block text-xs font-medium dark:text-[#89938F] mb-2 uppercase tracking-wider m3-select">
            Created
          </label>
          <select
            id="mobile-filter-date"
            value={dateFilter}
            onChange={(e) => onDateChange(e.target.value)}
            className="m3-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today (&lt; 24h)</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
          </select>
        </div>

        {/* Apply & Close */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[52px] rounded-full bg-[#00695C] text-white text-sm font-semibold hover:bg-[#005449] active:scale-[0.98] transition-all shadow-sm mt-2 m3-select"
        >
          Apply Filters
        </button>
      </div>
    </BottomSheet>
  );
};
