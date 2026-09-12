import React, { useState } from 'react';
import {
  PhoneCall,
  Clock,
  Calendar,
  User,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Phone,
  MessageSquare,
  Sparkles,
  Volume2
} from 'lucide-react';
import { Call, Lead, User as UserType, CallOutcome } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface CallsViewProps {
  calls: Call[];
  leads: Lead[];
  users: UserType[];
  onStartCall: (lead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onOpenDetail: (lead: Lead) => void;
}

export const CallsView: React.FC<CallsViewProps> = ({
  calls,
  leads,
  users,
  onStartCall,
  onOpenWhatsApp,
  onOpenDetail
}) => {
  const { currentUser } = useAuth();
  const [selectedRep, setSelectedRep] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all');

  // Leads that have a callback reminder
  const leadsWithCallback = leads.filter(l => Boolean(l.callbackReminder));
  leadsWithCallback.sort((a, b) => new Date(a.callbackReminder!).getTime() - new Date(b.callbackReminder!).getTime());

  // Filter calls
  const filteredCalls = calls.filter((c) => {
    if (selectedRep !== 'all' && c.repId !== selectedRep) return false;
    if (selectedOutcome !== 'all' && c.outcome !== selectedOutcome) return false;
    return true;
  });

  const getOutcomeStyle = (outcome: CallOutcome) => {
    switch (outcome) {
      case 'Converted':
        return 'bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#80D5C4] border-transparent';
      case 'Interested':
        return 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border-transparent';
      case 'Follow-up':
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-transparent';
      case 'Not interested':
      default:
        return 'bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0] border-transparent';
    }
  };

  const totalMinutes = Math.round(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / 60);

  return (
    <div className="space-y-6">
      {/* Top Header & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#F8FAF8] dark:bg-[#1D201F] p-4 sm:p-5 rounded-[24px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-[#00695C] text-white flex items-center justify-center font-bold shadow-xs">
              <PhoneCall className="w-5 h-5 text-[#80D5C4]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#191C1B] dark:text-[#E1E3E0] tracking-tight m3-title-medium">
                Telecalling Console &amp; Logs
              </h2>
              <p className="text-xs text-[#6F7976] m3-body-small">
                Outbound shifts, talktime analytics, and scheduled customer callbacks
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-[10px] font-medium text-[#6F7976] uppercase tracking-wider">Total Calls</p>
            <p className="text-lg font-bold text-[#191C1B] dark:text-[#E1E3E0] font-mono">{calls.length}</p>
          </div>
          <div className="h-8 w-px bg-[#BEC9C5]/40 dark:bg-[#3F4946]/40" />
          <div className="text-right">
            <p className="text-[10px] font-medium text-[#6F7976] uppercase tracking-wider">Total Talktime</p>
            <p className="text-lg font-bold text-[#00695C] dark:text-[#80D5C4] font-mono">{totalMinutes} mins</p>
          </div>
        </div>
      </div>

      {/* Callbacks Due section */}
      <div className="bg-amber-500/10 dark:bg-amber-950/20 rounded-[24px] p-4 sm:p-5 border border-amber-500/30 dark:border-amber-900/50 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-amber-950 dark:text-amber-200 m3-title-small">
              Callbacks Due ({leadsWithCallback.length} Scheduled)
            </h3>
          </div>
          <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
            Follow up within scheduled time windows
          </span>
        </div>

        {leadsWithCallback.length === 0 ? (
          <div className="p-4 bg-[#F8FAF8]/90 dark:bg-[#1D201F]/90 rounded-[18px] border border-amber-500/20 text-xs text-[#6F7976] text-center">
            No pending callbacks scheduled. When you log a call with a callback reminder, it will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {leadsWithCallback.map((l) => {
              const callbackTime = new Date(l.callbackReminder!).getTime();
              const isOverdue = callbackTime < Date.now();
              const isDueSoon = callbackTime <= Date.now() + 3600000;

              return (
                <div
                  key={l.id}
                  className="bg-[#F8FAF8] dark:bg-[#1D201F] p-4 rounded-[20px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <button
                        onClick={() => onOpenDetail(l)}
                        className="text-xs font-semibold text-[#191C1B] dark:text-[#E1E3E0] hover:text-[#00695C] dark:hover:text-[#80D5C4] text-left line-clamp-1 transition-colors"
                      >
                        {l.name}
                      </button>
                      <span
                        className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${
                          isOverdue
                            ? 'bg-[#FFDAD6] text-[#410002] dark:bg-[#93000A] dark:text-[#FFB4AB]'
                            : isDueSoon
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
                            : 'bg-[#ECEFEC] text-[#191C1B] dark:bg-[#272B2A] dark:text-[#E1E3E0]'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : 'Due'}{' '}
                        {new Date(l.callbackReminder!).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-mono text-[#6F7976] mb-1.5">{l.phone}</p>
                    <p className="text-[11px] text-[#3F4946] dark:text-[#C4C7C5] line-clamp-2 italic mb-2">
                      "{l.notes || 'Scheduled callback'}"
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between">
                    <span className="text-[10px] text-[#6F7976]">Rep: {l.assignedRepName}</span>
                    <button
                      onClick={() => onStartCall(l)}
                      className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#00695C] hover:bg-[#005449] text-white flex items-center space-x-1.5 shadow-xs transition-colors min-h-[36px]"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#80D5C4]" />
                      <span>Call Now</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call History Table & Filters */}
      <div className="bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[24px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0]">Filter Calls:</span>

            {/* Rep filter */}
            <div className="flex items-center space-x-2 bg-[#ECEFEC] dark:bg-[#272B2A] px-3.5 py-1.5 rounded-full text-xs">
              <User className="w-3.5 h-3.5 text-[#6F7976]" />
              <select
                value={selectedRep}
                onChange={(e) => setSelectedRep(e.target.value)}
                className="text-xs font-medium m3-select"
              >
                <option value="all">All Telecallers</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Outcome filter */}
            <div className="flex items-center space-x-2 bg-[#ECEFEC] dark:bg-[#272B2A] px-3.5 py-1.5 rounded-full text-xs">
              <Filter className="w-3.5 h-3.5 text-[#6F7976]" />
              <select
                value={selectedOutcome}
                onChange={(e) => setSelectedOutcome(e.target.value)}
                className="text-xs font-medium m3-select"
              >
                <option value="all">All Outcomes</option>
                <option value="Interested">Interested</option>
                <option value="Follow-up">Follow-up</option>
                <option value="Converted">Converted</option>
                <option value="Not interested">Not interested</option>
              </select>
            </div>
          </div>

          <span className="text-xs text-[#6F7976] font-normal">
            Showing {filteredCalls.length} of {calls.length} calls
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60 text-[#6F7976] font-medium border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
              <tr>
                <th className="p-3.5">Lead / Phone</th>
                <th className="p-3.5">Date &amp; Time</th>
                <th className="p-3.5">Duration</th>
                <th className="p-3.5">Outcome</th>
                <th className="p-3.5">Telecaller</th>
                <th className="p-3.5">Discussion Notes</th>
                <th className="p-3.5 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#BEC9C5]/20 dark:divide-[#3F4946]/20 text-[#191C1B] dark:text-[#E1E3E0]">
              {filteredCalls.map((call) => {
                const lead = leads.find((l) => l.id === call.leadId);
                return (
                  <tr key={call.id} className="hover:bg-[#ECEFEC]/60 dark:hover:bg-[#272B2A]/40 transition-colors">
                    <td className="p-3.5 font-medium">
                      <button
                        onClick={() => lead && onOpenDetail(lead)}
                        className="font-semibold text-[#191C1B] dark:text-[#E1E3E0] hover:text-[#00695C] dark:hover:text-[#80D5C4] text-left block"
                      >
                        {call.leadName}
                      </button>
                      <span className="font-mono text-[11px] text-[#6F7976]">{call.leadPhone}</span>
                    </td>
                    <td className="p-3.5 text-[#6F7976] whitespace-nowrap">
                      {new Date(call.timestamp).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
                      {Math.floor(call.duration / 60)}m {call.duration % 60}s
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${getOutcomeStyle(call.outcome)}`}>
                        {call.outcome}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-[#191C1B] dark:text-[#E1E3E0] whitespace-nowrap">
                      {call.repName}
                    </td>
                    <td className="p-3.5 text-[#6F7976] max-w-xs truncate">
                      {call.notes}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap">
                      {lead && (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => onStartCall(lead)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#00695C] hover:bg-[#CCE8E1] dark:text-[#80D5C4] dark:hover:bg-[#004F46] transition-colors"
                            title="Call again"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenWhatsApp(lead)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[#00695C] hover:bg-[#CCE8E1] dark:text-[#80D5C4] dark:hover:bg-[#004F46] transition-colors"
                            title="Message on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredCalls.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#6F7976]">
                    No call logs matching the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
