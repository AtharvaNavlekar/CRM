import React from 'react';
import { MockLead } from '../../data/mockSeedData';
import { LeadCard } from './LeadCard';

interface LeadCardListProps {
  leads: MockLead[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onUpdateLead: (updated: MockLead) => void;
  onInitiateCall?: (lead: MockLead) => void;
  onOpenChat?: (lead: MockLead) => void;
}

/**
 * LeadCardList — Vertical scrollable list of LeadCard components.
 * 
 * Used on mobile (<640px) as a replacement for the data table.
 * Each card shows the essential lead information with prominent
 * Call and WhatsApp action buttons.
 */
export const LeadCardList: React.FC<LeadCardListProps> = ({
  leads,
  selectedIds,
  onToggleSelect,
  onUpdateLead,
  onInitiateCall,
  onOpenChat
}) => {
  const handleRatingChange = (lead: MockLead, newRating: number) => {
    onUpdateLead({ ...lead, rating: newRating });
  };

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#6F7976]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[#191C1B] dark:text-[#E1E3E0] m3-title-small">
          No leads found
        </p>
        <p className="text-xs text-[#6F7976] dark:text-[#89938F] mt-1 max-w-[240px]">
          Try adjusting your filters or search query to find matching leads.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-3 pb-28">
      {/* Selection summary (if any selected) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#CCE8E1]/50 dark:bg-[#005046]/30 border border-[#00695C]/30">
          <span className="text-xs font-medium text-[#00201B] dark:text-[#A3F2E4]">
            {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <button
            type="button"
            onClick={() => {
              // Clear all by toggling each one off — parent handles this
              selectedIds.forEach((id) => onToggleSelect(id));
            }}
            className="text-xs font-medium text-[#00695C] dark:text-[#80D5C4] hover:underline px-2 py-1 min-h-[32px]"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Lead cards */}
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          isSelected={selectedIds.has(lead.id)}
          onToggleSelect={onToggleSelect}
          onInitiateCall={onInitiateCall}
          onOpenChat={onOpenChat}
          onRatingChange={handleRatingChange}
        />
      ))}
    </div>
  );
};
