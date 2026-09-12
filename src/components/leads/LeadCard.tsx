import React from 'react';
import { Star, Phone, MessageSquare, ChevronRight } from 'lucide-react';
import { MockLead } from '../../data/mockSeedData';
import { AvatarBadge } from '../common/AvatarBadge';
import { StatusPill } from '../common/StatusPill';

interface LeadCardProps {
  lead: MockLead;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onInitiateCall?: (lead: MockLead) => void;
  onOpenChat?: (lead: MockLead) => void;
  onRatingChange?: (lead: MockLead, rating: number) => void;
}

/**
 * LeadCard — Mobile-optimized card view for a single lead.
 * 
 * Replaces the table row on screens < 640px. Shows critical information
 * at a glance with prominent Call and Chat action buttons.
 * All touch targets are ≥ 48×48dp per M3 accessibility guidelines.
 */
export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  isSelected,
  onToggleSelect,
  onInitiateCall,
  onOpenChat,
  onRatingChange
}) => {
  const formattedValue =
    lead.value >= 100000
      ? `₹ ${(lead.value / 100000).toFixed(1)} L`
      : `₹ ${lead.value.toLocaleString('en-IN')}`;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isSelected
          ? 'border-[#00695C] bg-[#CCE8E1]/20 dark:bg-[#004F46]/20 shadow-sm'
          : 'border-[#BEC9C5]/40 dark:border-[#3F4946]/40 bg-[#F8FAF8] dark:bg-[#1D201F] hover:border-[#BEC9C5] dark:hover:border-[#3F4946]'
      }`}
    >
      {/* Card Header — tap to select */}
      <button
        type="button"
        onClick={() => onToggleSelect(lead.id)}
        className="w-full text-left p-4 pb-2 flex items-start justify-between min-h-[48px]"
        aria-label={`${isSelected ? 'Deselect' : 'Select'} lead ${lead.name}`}
      >
        <div className="flex-1 min-w-0">
          {/* Name + Phone */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[#191C1B] dark:text-[#E1E3E0] truncate m3-title-small">
              {lead.name}
            </h3>
            {isSelected && (
              <span className="w-2 h-2 rounded-full bg-[#00695C] shrink-0" />
            )}
          </div>
          <p className="text-xs text-[#6F7976] dark:text-[#89938F] font-mono">
            {lead.phone}
          </p>
          {lead.companyOrProject && (
            <p className="text-xs text-[#6F7976] dark:text-[#89938F] truncate mt-0.5">
              {lead.companyOrProject}
            </p>
          )}
        </div>

        {/* Status Pill */}
        <div className="shrink-0 ml-3">
          <StatusPill status={lead.stage || lead.status} size="sm" />
        </div>
      </button>

      {/* Card Body — metadata row */}
      <div className="px-4 pb-2 flex items-center justify-between gap-3 flex-wrap">
        {/* Stars + Assignee + Value */}
        <div className="flex items-center gap-3 text-xs text-[#3F4946] dark:text-[#BEC9C5] min-w-0">
          {/* Compact star rating */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRatingChange?.(lead, lead.rating === star ? 0 : star);
                }}
                aria-label={`Set rating to ${star} stars`}
                className="w-6 h-6 flex items-center justify-center rounded-full"
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    star <= lead.rating
                      ? 'text-amber-500 fill-amber-500'
                      : 'text-[#BEC9C5] dark:text-[#6F7976]'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Separator dot */}
          <span className="text-[#BEC9C5] dark:text-[#3F4946]">·</span>

          {/* Assignee */}
          <div className="flex items-center gap-1.5 truncate">
            <AvatarBadge name={lead.assignee} size="sm" />
            <span className="truncate text-xs font-medium">{lead.assignee}</span>
          </div>
        </div>

        {/* Value badge */}
        <span className="text-xs font-mono font-semibold text-[#191C1B] dark:text-[#E1E3E0] shrink-0">
          {formattedValue}
        </span>
      </div>

      {/* Compliance indicators (if any) */}
      {(lead.fatigueStatus === 'capped' || lead.fatigueStatus === 'at_risk' || lead.preferences?.preferredChannel === 'WhatsApp' || lead.preferences?.isPaused30Days) && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {lead.fatigueStatus === 'capped' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFDAD6] text-[#410002]">
              🛑 Capped (3/3)
            </span>
          )}
          {lead.fatigueStatus === 'at_risk' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
              ⚠️ Near Cap (2/3)
            </span>
          )}
          {lead.preferences?.preferredChannel === 'WhatsApp' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#CCE8E1] text-[#00201B]">
              💬 WA Only
            </span>
          )}
          {lead.preferences?.isPaused30Days && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-900">
              ⏸️ Paused 30d
            </span>
          )}
        </div>
      )}

      {/* Action buttons — full width, prominent */}
      <div className="px-4 pb-4 pt-1 flex items-center gap-2.5">
        {(() => {
          const isCallBlocked =
            lead.fatigueStatus === 'capped' ||
            lead.preferences?.preferredChannel === 'WhatsApp' ||
            lead.preferences?.isOptedOut;

          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isCallBlocked) onInitiateCall?.(lead);
              }}
              disabled={isCallBlocked}
              aria-label={`Call ${lead.name}`}
              title={isCallBlocked ? 'Calling restricted for this lead' : `Call ${lead.name}`}
              className={`flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-2xl text-xs font-semibold transition-all ${
                isCallBlocked
                  ? 'bg-[#ECEFEC] dark:bg-[#272B2A] text-[#6F7976] cursor-not-allowed'
                  : 'bg-[#CCE8E1] dark:bg-[#005046] text-[#00201B] dark:text-[#A3F2E4] hover:bg-[#B7DFD6] dark:hover:bg-[#006558] active:scale-[0.98]'
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Call</span>
            </button>
          );
        })()}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChat?.(lead);
          }}
          aria-label={`Chat with ${lead.name} on WhatsApp`}
          className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-2xl text-xs font-semibold bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 hover:bg-[#E6EAE6] dark:hover:bg-[#323634] active:scale-[0.98] transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp</span>
        </button>
      </div>
    </div>
  );
};
