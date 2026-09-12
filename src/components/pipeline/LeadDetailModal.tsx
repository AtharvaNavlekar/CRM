import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MessageSquare,
  Clock,
  Calendar,
  UserCheck,
  Tag,
  FileText,
  Briefcase,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History,
  Send
} from 'lucide-react';
import { Lead, LeadStage, Call, Message, User } from '../../types';
import { api } from '../../services/api';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
  onStartCall: (lead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onUpdateStage: (leadId: string, stage: LeadStage) => void;
  onAssignRep: (leadId: string, repId: string) => void;
  onUpdateLead: (updated: Lead) => void;
  users: User[];
}

const STAGES: LeadStage[] = ['New', 'Contacted', 'Follow-up', 'Negotiation', 'Won', 'Lost'];

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  lead,
  onClose,
  onStartCall,
  onOpenWhatsApp,
  onUpdateStage,
  onAssignRep,
  onUpdateLead,
  users
}) => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [callbackInput, setCallbackInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');
  const [statusError, setStatusError] = useState('');

  const modalRef = useModalFocusTrap(Boolean(lead), onClose);

  useEffect(() => {
    if (!lead) {
      setCalls([]);
      setMessages([]);
      setCallbackInput('');
      setNotesInput('');
      setStatusError('');
      return;
    }

    setCallbackInput(
      lead.callbackReminder ? new Date(lead.callbackReminder).toISOString().slice(0, 16) : ''
    );
    setNotesInput(lead.notes || '');
    setStatusError('');

    let isMounted = true;
    const loadHistory = async () => {
      setIsLoadingActivity(true);
      try {
        const [callList, msgList] = await Promise.all([
          api.getCalls({ leadId: lead.id }),
          api.getMessages(lead.id)
        ]);
        if (isMounted) {
          setCalls(callList);
          setMessages(msgList);
        }
      } catch (err) {
        console.error('Error fetching lead activity history:', err);
      } finally {
        if (isMounted) setIsLoadingActivity(false);
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [lead?.id]);

  if (!lead) return null;

  const handleSaveCallbackReminder = async () => {
    setStatusError('');
    try {
      const updated = await api.updateLead(lead.id, {
        callbackReminder: callbackInput ? new Date(callbackInput).toISOString() : null,
        version: lead.version,
        updatedAt: lead.updatedAt
      });
      onUpdateLead(updated);
      setStatusFeedback('Callback reminder updated!');
      setTimeout(() => setStatusFeedback(''), 2500);
    } catch (e: any) {
      if (e?.status === 409 || e?.data?.code === 'LEAD_CONFLICT') {
        setStatusError('Conflict: This lead was modified by another session. Please close and re-open to load the latest changes.');
      } else {
        setStatusError(e?.message || 'Failed to update callback reminder.');
      }
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setStatusError('');
    try {
      const updated = await api.updateLead(lead.id, {
        notes: notesInput.trim(),
        version: lead.version,
        updatedAt: lead.updatedAt
      });
      onUpdateLead(updated);
      setStatusFeedback('Notes saved successfully!');
      setTimeout(() => setStatusFeedback(''), 2500);
    } catch (e: any) {
      if (e?.status === 409 || e?.data?.code === 'LEAD_CONFLICT') {
        setStatusError('Conflict: This lead was modified by another session. Please close and re-open to load the latest changes.');
      } else {
        setStatusError(e?.message || 'Failed to update notes.');
      }
    } finally {
      setIsSavingNotes(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₹0';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  // Combine calls and messages into chronological timeline
  const combinedTimeline = [
    ...calls.map(c => ({ type: 'call' as const, time: c.timestamp, data: c })),
    ...messages.map(m => ({ type: 'message' as const, time: m.timestamp, data: m }))
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        id="modal-lead-detail"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-lead-detail-title"
        className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] outline-none"
        tabIndex={-1}
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-[#1F3A5F] text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#2E6E5C] flex items-center justify-center text-white font-bold text-base shadow-md">
              {lead.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="modal-lead-detail-title" className="text-base font-bold text-white">{lead.name}</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/20 text-white">
                  {lead.source}
                </span>
                {lead.industry && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-400/30">
                    {lead.industry}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">{lead.phone}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onStartCall(lead)}
              aria-label={`Start call with ${lead.name}`}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#2E6E5C] hover:bg-[#255b4c] text-white flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Now</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenWhatsApp(lead)}
              aria-label={`Open WhatsApp chat with ${lead.name}`}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close lead detail dialog"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {statusError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 font-semibold flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span>{statusError}</span>
              </div>
            </div>
          )}

          {statusFeedback && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{statusFeedback}</span>
            </div>
          )}

          {/* Pipeline Stage Progression Stepper */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Pipeline Stage Progression
              </span>
              <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400">
                Current: {lead.stage}
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {STAGES.map((st) => {
                const isActive = lead.stage === st;
                return (
                  <button
                    key={st}
                    onClick={() => onUpdateStage(lead.id, st)}
                    className={`py-2 px-1 rounded-xl text-[11px] font-bold border transition-all text-center ${
                      isActive
                        ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Value */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <IndianRupee className="w-3.5 h-3.5 text-teal-600" />
                <span>Estimated Value</span>
              </span>
              <p className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                {formatCurrency(lead.value)}
              </p>
            </div>

            {/* Assigned Rep */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Assigned Telecaller</span>
              </span>
              <select
                value={lead.assignedRepId}
                onChange={(e) => onAssignRep(lead.id, e.target.value)}
                className="w-full mt-1.5 p-1 text-xs font-bold m3-select"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Callback Reminder Date/Time Picker */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Callback Reminder</span>
              </span>
              <div className="flex items-center space-x-1.5 mt-1.5">
                <input
                  type="datetime-local"
                  value={callbackInput}
                  onChange={(e) => setCallbackInput(e.target.value)}
                  className="w-full text-xs p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={handleSaveCallbackReminder}
                  className="px-2 py-1 rounded-lg text-xs font-bold bg-[#2E6E5C] text-white hover:bg-[#235849] whitespace-nowrap"
                >
                  Set
                </button>
              </div>
            </div>
          </div>

          {/* Notes & Requirements Editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Lead Notes & Telecalling Requirements
              </label>
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
            <textarea
              rows={3}
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
              placeholder="Add key talking points, customer objections, or preferred timing..."
            />
          </div>

          {/* Unified Activity Timeline */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Call & WhatsApp Activity Timeline</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {combinedTimeline.length} total interactions
              </span>
            </div>

            {isLoadingActivity ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading interactions...</div>
            ) : combinedTimeline.length === 0 ? (
              <div className="py-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                No calls or WhatsApp messages logged yet. Use the top buttons to reach out!
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:top-2 before:bottom-2 before:left-3.5 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 pl-8">
                {combinedTimeline.map((item, idx) => {
                  if (item.type === 'call') {
                    const call = item.data as Call;
                    return (
                      <div key={call.id || idx} className="relative">
                        <div className="absolute -left-8 top-1 w-7 h-7 rounded-full bg-[#1F3A5F] text-white flex items-center justify-center text-xs shadow-xs">
                          <Phone className="w-3.5 h-3.5 text-teal-300" />
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              Phone Call Logged ({Math.floor(call.duration / 60)}m {call.duration % 60}s)
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(call.timestamp).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs mb-1.5">
                            <span className="font-semibold text-teal-700 dark:text-teal-400">
                              Outcome: {call.outcome}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Rep: {call.repName}</span>
                          </div>
                          {call.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-white dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800">
                              "{call.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    const msg = item.data as Message;
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div key={msg.id || idx} className="relative">
                        <div
                          className={`absolute -left-8 top-1 w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-xs ${
                            isOutbound ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-white'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {isOutbound ? 'WhatsApp Sent' : 'WhatsApp Received'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(msg.timestamp).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200">
                            {msg.text}
                          </p>
                          <div className="mt-1 flex items-center justify-end text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span>Status: {msg.deliveryStatus}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <span>Created: {new Date(lead.createdDate).toLocaleDateString('en-IN')}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};
