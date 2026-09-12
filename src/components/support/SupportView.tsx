import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  User,
  Tag,
  AlertTriangle,
  X,
  Sparkles
} from 'lucide-react';
import { Ticket, TicketStatus, TicketPriority, Lead, User as UserType } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface SupportViewProps {
  leads: Lead[];
  users: UserType[];
}

export const SupportView: React.FC<SupportViewProps> = ({ leads, users }) => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New ticket modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState<TicketPriority>('High');
  const [newLeadId, setNewLeadId] = useState('');
  const [newInitialMsg, setNewInitialMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const fetchTickets = async () => {
    try {
      const data = await api.getTickets();
      setTickets(data);
      if (selectedTicket) {
        const refreshed = data.find(t => t.id === selectedTicket.id);
        if (refreshed) setSelectedTicket(refreshed);
      } else if (data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      }
    } catch (e) {
      console.error('Error fetching tickets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Format SLA countdown
  const getSlaInfo = (slaDueTime: string, status: TicketStatus) => {
    if (status === 'Resolved') {
      return { text: 'Resolved in SLA', isOverdue: false, badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
    }
    const diffMs = new Date(slaDueTime).getTime() - Date.now();
    if (diffMs <= 0) {
      return { text: 'SLA Breached', isOverdue: true, badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 animate-pulse' };
    }
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    const text = `${hours}h ${mins}m left`;
    const badgeClass = hours < 2
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300';
    return { text, isOverdue: false, badgeClass };
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await api.createTicket({
        subject: newSubject.trim(),
        priority: newPriority,
        leadId: newLeadId || undefined,
        initialMessage: newInitialMsg.trim(),
        userName: currentUser?.name,
        userRole: currentUser?.role
      });
      setTickets(prev => [created, ...prev]);
      setSelectedTicket(created);
      setIsModalOpen(false);
      setNewSubject('');
      setNewInitialMsg('');
    } catch (e) {
      console.error('Failed to create ticket:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !selectedTicket || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const updated = await api.replyTicket(selectedTicket.id, {
        text: replyText.trim(),
        sender: currentUser?.name || 'Support Agent',
        senderRole: currentUser?.role || 'telecaller'
      });
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      setReplyText('');
    } catch (e) {
      console.error('Failed to reply to ticket:', e);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateTicket(selectedTicket.id, { status });
      setSelectedTicket(updated);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'Open':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'In Progress':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 border-sky-200 dark:border-sky-800';
      case 'Resolved':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center font-bold">
            <LifeBuoy className="w-4 h-4 text-teal-300" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Support & SLA Desk
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              4-Hour First Response Target SLA for sales escalations, docs & tech issues
            </p>
          </div>
        </div>

        <button
          id="btn-new-ticket"
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2E6E5C] hover:bg-[#255b4c] text-white flex items-center space-x-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Ticket</span>
        </button>
      </div>

      {/* Ticket split workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-210px)] min-h-[500px]">
        {/* Ticket List (Left 5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tickets ({tickets.length})
            </span>
            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
              4h SLA Target
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {tickets.map((t) => {
              const sla = getSlaInfo(t.slaDueTime, t.status);
              const isSelected = selectedTicket?.id === t.id;

              return (
                <button
                  key={t.id}
                  id={`ticket-item-${t.id}`}
                  onClick={() => setSelectedTicket(t)}
                  className={`w-full p-3.5 text-left transition-colors flex flex-col space-y-1.5 ${
                    isSelected
                      ? 'bg-teal-50/70 dark:bg-teal-950/40 border-l-4 border-[#2E6E5C]'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {t.subject}
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono text-slate-400">#{t.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center space-x-1 ${sla.badgeClass}`}>
                      <Clock className="w-3 h-3 inline" />
                      <span>{sla.text}</span>
                    </span>
                  </div>

                  {t.leadName && (
                    <div className="text-[11px] text-teal-700 dark:text-teal-400 font-medium truncate">
                      Lead: {t.leadName}
                    </div>
                  )}
                </button>
              );
            })}

            {tickets.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400">
                No tickets open. Click "New Support Ticket" to report an issue.
              </div>
            )}
          </div>
        </div>

        {/* Ticket Detail & Replies Thread (Right 7 cols) */}
        {selectedTicket ? (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col overflow-hidden">
            {/* Ticket Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase">#{selectedTicket.id}</span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedTicket.subject}
                  </h3>
                </div>

                {/* Status selector */}
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                  className="text-xs font-bold p-1.5 m3-select"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <span className={`px-2 py-0.5 rounded-md border font-semibold ${getSlaInfo(selectedTicket.slaDueTime, selectedTicket.status).badgeClass}`}>
                  SLA Target: {new Date(selectedTicket.slaDueTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({getSlaInfo(selectedTicket.slaDueTime, selectedTicket.status).text})
                </span>
                <span>•</span>
                <span>Priority: <strong>{selectedTicket.priority}</strong></span>
                {selectedTicket.leadName && (
                  <>
                    <span>•</span>
                    <span>Linked: <strong className="text-teal-600">{selectedTicket.leadName}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* Replies Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {selectedTicket.replies.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 text-xs"
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {r.sender} <span className="font-normal text-[11px] text-slate-400">({r.senderRole})</span>
                    </span>
                    <span className="text-[10px]">
                      {new Date(r.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {r.text}
                  </p>
                </div>
              ))}

              {selectedTicket.replies.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No replies yet. Type an update below to respond within the 4-hour SLA.
                </div>
              )}
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSendReply} className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
              <input
                id="input-ticket-reply"
                type="text"
                placeholder="Post reply or SLA status update..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
              />
              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2E6E5C] hover:bg-[#255b4c] disabled:opacity-50 text-white flex items-center space-x-1 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Reply</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col items-center justify-center text-slate-400 text-center">
            <LifeBuoy className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-xs">Select a ticket to view SLA details and conversation thread</p>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 bg-[#1F3A5F] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">Create Escalation / Support Ticket</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-lg text-slate-300 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ticket Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Document sanction letter delay for client"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 text-xs m3-select"
                  >
                    <option value="High">High (Urgent Deals)</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Link to Lead (Optional)
                  </label>
                  <select
                    value={newLeadId}
                    onChange={(e) => setNewLeadId(e.target.value)}
                    className="w-full px-3 py-2 text-xs truncate m3-select"
                  >
                    <option value="">None (General Issue)</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Message / Incident Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the issue or client query that requires attention..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2E6E5C]"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2E6E5C] text-white hover:bg-[#255b4c]"
                >
                  {isSubmitting ? 'Opening Ticket...' : 'Create Ticket (4h SLA)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
