import React from 'react';
import { Filter } from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { MaterialDropdown } from '../common/MaterialDropdown';
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
          <label className="block text-xs font-medium text-[#6F7976] dark:text-[#89938F] mb-2 uppercase tracking-wider">
            Lead Stage
          </label>
          <MaterialDropdown
            id="mobile-filter-stage"
            value={stageFilter}
            onChange={onStageChange}
            variant="form"
            options={[
              { value: 'all', label: `All Stages (${PIPELINE_STAGES.length})` },
              ...PIPELINE_STAGES.map((st) => ({ value: st, label: st })),
            ]}
          />
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-xs font-medium dark:text-[#89938F] mb-2 uppercase tracking-wider">
            Assignee
          </label>
          <MaterialDropdown
            id="mobile-filter-assignee"
            value={assigneeFilter}
            onChange={onAssigneeChange}
            variant="form"
            options={[
              { value: 'all', label: 'All Assignees' },
              ...TEAM_MEMBERS.map((m) => ({ value: m.name, label: m.name })),
            ]}
          />
        </div>

        {/* Source */}
        <div>
          <label className="block text-xs font-medium dark:text-[#89938F] mb-2 uppercase tracking-wider">
            Source
          </label>
          <MaterialDropdown
            id="mobile-filter-source"
            value={sourceFilter}
            onChange={onSourceChange}
            variant="form"
            options={[
              { value: 'all', label: `All Sources (${availableSources.length})` },
              ...availableSources.map((src) => ({ value: src, label: src })),
            ]}
          />
        </div>

        {/* Compliance */}
        <div>
          <label className="block text-xs font-medium dark:text-[#89938F] mb-2 uppercase tracking-wider">
            Compliance
          </label>
          <MaterialDropdown
            id="mobile-filter-compliance"
            value={complianceFilter}
            onChange={onComplianceChange}
            variant="form"
            options={[
              { value: 'all', label: 'All Leads' },
              { value: 'capped', label: 'Capped (3/3 Calls)', icon: <span>🛑</span> },
              { value: 'at_risk', label: 'Near Cap (2/3 Calls)', icon: <span>⚠️</span> },
              { value: 'whatsapp_only', label: 'WhatsApp Only', icon: <span>💬</span> },
              { value: 'paused_opted_out', label: 'Paused / Opted-out', icon: <span>⏸️</span> },
            ]}
          />
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-xs font-medium dark:text-[#89938F] mb-2 uppercase tracking-wider">
            Created
          </label>
          <MaterialDropdown
            id="mobile-filter-date"
            value={dateFilter}
            onChange={onDateChange}
            variant="form"
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today (< 24h)' },
              { value: 'week', label: 'Past Week' },
              { value: 'month', label: 'Past Month' },
            ]}
          />
        </div>

        {/* Apply & Close */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[52px] rounded-full bg-[#00695C] text-white text-sm font-semibold hover:bg-[#005449] active:scale-[0.98] transition-all shadow-sm mt-2"
        >
          Apply Filters
        </button>
      </div>
    </BottomSheet>
  );
};
