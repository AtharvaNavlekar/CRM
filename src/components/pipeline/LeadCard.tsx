import React from 'react';
import { Phone, MessageSquare, Clock, Calendar, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';
import { Lead, LeadStage, User } from '../../types';

interface LeadCardProps {
  lead: Lead;
  users?: User[];
  onOpenDetail: (lead: Lead) => void;
  onStartCall: (lead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onUpdateStage: (leadId: string, newStage: LeadStage) => void;
  onAssignRep?: (leadId: string, repId: string) => void;
  isDraggable?: boolean;
  onDragStart?: (e: React.DragEvent, leadId: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (leadId: string) => void;
  isSelectMode?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  users = [],
  onOpenDetail,
  onStartCall,
  onOpenWhatsApp,
  onUpdateStage,
  onAssignRep = (_leadId: string, _repId: string) => {},
  isDraggable = true,
  onDragStart,
  isSelected = false,
  onToggleSelect,
  isSelectMode = false
}) => {
  const getSourceBadge = (source: Lead['source']) => {
    switch (source) {
      case 'WhatsApp':
        return 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80';
      case 'IndiaMART':
        return 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/80';
      case 'Website':
        return 'bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/80';
      case 'Google Ads':
        return 'bg-yellow-50 dark:bg-yellow-950/70 text-yellow-800 dark:text-yellow-300 border-yellow-200/80 dark:border-yellow-800/80';
      case 'Facebook':
        return 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80';
      case 'Manual':
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Check if callback reminder is due or overdue
  const isCallbackDue = lead.callbackReminder ? new Date(lead.callbackReminder).getTime() <= Date.now() + 3600000 : false;
  const isCallbackOverdue = lead.callbackReminder ? new Date(lead.callbackReminder).getTime() < Date.now() : false;

  return (
    <div
      id={`lead-card-${lead.id}`}
      draggable={isDraggable}
      onDragStart={(e) => onDragStart && onDragStart(e, lead.id)}
      className={`group relative bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[20px] p-3.5 border transition-all duration-200 cursor-grab active:cursor-grabbing shadow-xs hover:shadow-md ${
        isSelected
          ? 'border-[#00695C] ring-2 ring-[#00695C]/40 bg-[#CCE8E1]/30 dark:bg-[#004F46]/20'
          : 'border-[#BEC9C5]/40 dark:border-[#3F4946]/40 hover:border-[#00695C]/60 dark:hover:border-[#80D5C4]/60'
      }`}
    >
      {/* Top row: Checkbox, Name & Value */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center space-x-2 min-w-0">
          {(isSelectMode || onToggleSelect) && (
            <input
              type="checkbox"
              id={`select-lead-checkbox-${lead.id}`}
              aria-label={`Select lead ${lead.name}`}
              checked={isSelected}
              onChange={() => onToggleSelect && onToggleSelect(lead.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded text-[#00695C] border-[#BEC9C5] dark:border-[#3F4946] focus:ring-[#00695C] focus-visible:ring-2 cursor-pointer"
            />
          )}
          <button
            type="button"
            onClick={() => onOpenDetail(lead)}
            aria-label={`View details for ${lead.name}`}
            className="text-left font-semibold text-xs sm:text-sm text-[#191C1B] dark:text-[#E1E3E0] hover:text-[#00695C] dark:hover:text-[#80D5C4] leading-snug line-clamp-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] rounded"
          >
            {lead.name}
          </button>
        </div>
        {lead.value ? (
          <span className="text-[11px] font-semibold text-[#00201B] dark:text-[#80D5C4] bg-[#CCE8E1] dark:bg-[#004F46] px-2.5 py-0.5 rounded-full whitespace-nowrap tabular-nums">
            {formatCurrency(lead.value)}
          </span>
        ) : null}
      </div>

      {/* Phone number and industry */}
      <div className="flex items-center space-x-2 text-xs text-[#6F7976] mb-2 font-normal">
        <span className="tabular-nums text-[11px] font-mono">{lead.phone}</span>
        {lead.industry && (
          <>
            <span className="text-[#BEC9C5] dark:text-[#3F4946]">•</span>
            <span className="text-[11px] text-[#6F7976]">{lead.industry}</span>
          </>
        )}
      </div>

      {/* Badges: Source & Callback Reminder */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${getSourceBadge(lead.source)}`}>
          {lead.source}
        </span>

        {lead.callbackReminder && (
          <span
            className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
              isCallbackOverdue
                ? 'bg-[#FFDAD6] text-[#410002] dark:bg-[#93000A] dark:text-[#FFB4AB]'
                : isCallbackDue
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                : 'bg-[#ECEFEC] text-[#191C1B] dark:bg-[#272B2A] dark:text-[#E1E3E0]'
            }`}
            title={`Callback reminder: ${new Date(lead.callbackReminder).toLocaleString('en-IN')}`}
          >
            <Clock className="w-3 h-3 inline text-[#6F7976]" />
            <span>
              {isCallbackOverdue ? 'Overdue' : 'Due'}{' '}
              {new Date(lead.callbackReminder).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </span>
        )}
      </div>

      {/* Notes preview */}
      {lead.notes && (
        <p
          onClick={() => onOpenDetail(lead)}
          className="text-[11px] text-[#3F4946] dark:text-[#C4C7C5] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60 p-2.5 rounded-[12px] mb-2.5 line-clamp-2 italic border border-transparent cursor-pointer"
        >
          "{lead.notes}"
        </p>
      )}

      {/* Rep Assignment & Stage Selector */}
      <div className="flex items-center justify-between pt-2 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 mb-2.5">
        <div className="flex items-center space-x-1 text-[#6F7976]">
          <UserCheck className="w-3.5 h-3.5 text-[#6F7976]" />
          <span className="text-[11px]">Rep:</span>
        </div>
        <select
          id={`select-rep-${lead.id}`}
          value={lead.assignedRepId}
          aria-label={`Assign sales representative for ${lead.name}`}
          onChange={(e) => onAssignRep(lead.id, e.target.value)}
          className="text-[11px] font-medium hover:text-[#00695C] dark:hover:text-[#80D5C4] text-right max-w-[130px] truncate m3-select"
        >
          {users.map((u) => (
            <option key={u.id} value={u.id} className="text-[#191C1B] dark:bg-[#1D201F] dark:text-[#E1E3E0]">
              {u.name} ({u.role})
            </option>
          ))}
        </select>
      </div>

      {/* Bottom Action Buttons: Call, WhatsApp */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          id={`btn-call-lead-${lead.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartCall(lead);
          }}
          aria-label={`Start phone call to ${lead.name}`}
          className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-full text-xs font-medium bg-[#1F3A5F] hover:bg-[#162A45] text-white transition-colors shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F] min-h-[36px]"
          title={`Simulate phone call to ${lead.name}`}
        >
          <Phone className="w-3.5 h-3.5 text-teal-300" />
          <span>Call</span>
        </button>

        <button
          id={`btn-wa-lead-${lead.id}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenWhatsApp(lead);
          }}
          aria-label={`Open WhatsApp chat with ${lead.name}`}
          className="flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-full text-xs font-medium bg-[#00695C] hover:bg-[#005449] text-white transition-colors shadow-xs active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] min-h-[36px]"
          title={`Open WhatsApp chat with ${lead.name}`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#80D5C4]" />
          <span>WhatsApp</span>
        </button>
      </div>
    </div>
  );
};
