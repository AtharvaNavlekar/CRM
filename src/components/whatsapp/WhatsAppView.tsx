import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Check,
  CheckCheck,
  Clock,
  Phone,
  User,
  Sparkles,
  Paperclip,
  Smile,
  Zap,
  Bot,
  Search,
  ChevronRight,
  Info,
  AlertTriangle,
  RotateCw,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { Lead, Message, DeliveryStatus } from '../../types';
import { api } from '../../services/api';

interface WhatsAppViewProps {
  leads: Lead[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
  onStartCall: (lead: Lead) => void;
  onOpenDetail: (lead: Lead) => void;
}

const QUICK_TEMPLATES = [
  {
    label: '✨ Brochure Intro',
    text: 'Namaste! Thanks for your interest in our project. Here is our official digital brochure & pricing sheet: https://telecrm.in/brochure'
  },
  {
    label: '📞 Schedule Call',
    text: 'Hi! Would you be available for a quick 5-minute call today to discuss your exact requirement?'
  },
  {
    label: '🏦 Loan Eligibility',
    text: 'Good day! Your preliminary SME loan eligibility calculation has been processed with instant approval subvention rates.'
  },
  {
    label: '🏡 Site Visit',
    text: 'Namaste! We have VIP weekend site visits scheduled this Saturday with pickup/drop assistance. Can we book a slot for your family?'
  },
  {
    label: '🎓 Syllabus & Demo',
    text: 'Hello! Sharing the comprehensive curriculum module and upcoming weekend live batch timetable.'
  }
];

export const WhatsAppView: React.FC<WhatsAppViewProps> = ({
  leads,
  selectedLeadId,
  onSelectLead,
  onStartCall,
  onOpenDetail
}) => {
  const activeLead = leads.find((l) => l.id === selectedLeadId) || leads[0];
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageHealth, setMessageHealth] = useState<{
    totalOutbound: number;
    delivered: number;
    queued: number;
    retrying: number;
    failed: number;
    deliveryRate: number;
  }>({ totalOutbound: 0, delivered: 0, queued: 0, retrying: 0, failed: 0, deliveryRate: 100 });
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchChatMessages = async (leadId: string) => {
    try {
      const msgs = await api.getMessages(leadId);
      setMessages(msgs);
    } catch (e) {
      console.error('Error fetching WhatsApp messages:', e);
    }
  };

  const fetchHealthStats = async () => {
    try {
      const health = await api.getMessageHealth();
      if (health) setMessageHealth(health);
    } catch (e) {
      console.error('Error fetching WhatsApp health:', e);
    }
  };

  // Poll / fetch on active lead change
  useEffect(() => {
    fetchHealthStats();
    if (!activeLead) return;
    setIsLoadingMessages(true);
    fetchChatMessages(activeLead.id).finally(() => setIsLoadingMessages(false));

    // Poll periodically to catch the simulated async queue progression (Queued -> Sent -> Delivered/Retrying)
    const interval = setInterval(() => {
      fetchChatMessages(activeLead.id);
      fetchHealthStats();
    }, 1200);

    return () => clearInterval(interval);
  }, [activeLead?.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeLead || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      // API adds with 'Queued' status, progresses to 'Sent', and simulates ~10% transient retry before 'Delivered'
      const newMsg = await api.sendMessage(activeLead.id, text, 'outbound');
      setMessages((prev) => [...prev, newMsg]);
      fetchHealthStats();
    } catch (e) {
      console.error('Failed to send WhatsApp message:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleSimulateReply = async () => {
    if (!activeLead) return;
    try {
      const reply = await api.simulateLeadReply(activeLead.id);
      setMessages((prev) => [...prev, reply]);
    } catch (e) {
      console.error('Failed to simulate reply:', e);
    }
  };

  const renderStatusTicks = (status: DeliveryStatus, retryCount?: number) => {
    switch (status) {
      case 'Delivered':
        return (
          <span className="flex items-center space-x-1 text-sky-400" title="Delivered to WhatsApp recipient">
            <CheckCheck className="w-3.5 h-3.5 inline text-sky-400" />
            {retryCount && retryCount > 0 ? (
              <span className="text-[9px] font-bold text-amber-500 bg-amber-100/90 dark:bg-amber-950/80 px-1 rounded border border-amber-300 dark:border-amber-700">
                retry #{retryCount}
              </span>
            ) : null}
          </span>
        );
      case 'Sent':
        return (
          <span className="flex items-center text-slate-300" title="Sent to WhatsApp Server">
            <Check className="w-3.5 h-3.5 inline text-slate-300" />
          </span>
        );
      case 'Queued':
        return (
          <span className="flex items-center space-x-1 text-amber-500 dark:text-amber-300 animate-pulse font-semibold" title="Queued in outbound pipeline">
            <Clock className="w-3 h-3 inline text-amber-400" />
            <span className="text-[9px]">Queued</span>
          </span>
        );
      case 'Failed-Retrying':
        return (
          <span className="flex items-center space-x-1 text-amber-500 dark:text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30 animate-pulse" title="Simulated transient network failure - auto recovering">
            <RotateCw className="w-3 h-3 inline animate-spin text-amber-400" />
            <span className="text-[9px]">Failed · Retrying (1/3)</span>
          </span>
        );
      case 'Failed':
      default:
        return (
          <span className="flex items-center space-x-1 text-rose-400 text-[10px] font-bold" title="Delivery failure">
            <AlertTriangle className="w-3 h-3 text-rose-400 inline" />
            <span>Failed</span>
          </span>
        );
    }
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.industry && l.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-[calc(100vh-140px)] min-h-[550px] bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[28px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-xs overflow-hidden flex flex-col">
      {/* Top Persistent Message Delivery Health Header */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-[#00201B] text-[#E1E3E0] border-b border-[#3F4946]/30 text-xs gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-1.5 text-[#80D5C4] font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Delivery Reliability Engine:</span>
          </div>
          <span className="font-mono text-[#C4C7C5]">
            {messageHealth.delivered} / {messageHealth.totalOutbound || messageHealth.delivered} delivered
          </span>
          {messageHealth.retrying > 0 && (
            <span className="text-[11px] text-amber-300 font-medium bg-amber-900/60 px-2.5 py-0.5 rounded-full border border-amber-500/40 animate-pulse flex items-center space-x-1">
              <RotateCw className="w-3 h-3 animate-spin" />
              <span>{messageHealth.retrying} retrying</span>
            </span>
          )}
          {messageHealth.queued > 0 && (
            <span className="text-[11px] text-sky-300 font-medium bg-sky-900/60 px-2.5 py-0.5 rounded-full border border-sky-500/40 flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{messageHealth.queued} queued</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3 text-[#A2ADA9] text-xs">
          <span className="font-medium text-[#80D5C4] bg-[#004F46] px-2.5 py-0.5 rounded-full font-mono">
            {messageHealth.deliveryRate}% Queue Health
          </span>
          <span className="hidden sm:inline text-[#A2ADA9] text-[11px]">
            Zero Silent Drops · Queue + Auto-Retry Guaranteed
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Left Column: Lead Conversations List */}
      <div className="w-full md:w-80 border-r border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex flex-col bg-[#F8FAF8] dark:bg-[#1D201F]">
        {/* Header */}
        <div className="p-4 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 bg-[#F8FAF8] dark:bg-[#1D201F]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-[#00695C] flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-[#191C1B] dark:text-[#E1E3E0] m3-title-small">WhatsApp Chats</h2>
            </div>
            <span className="text-[10px] font-medium uppercase bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#80D5C4] px-2.5 py-0.5 rounded-full">
              Cloud API
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#6F7976] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search chat or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#ECEFEC] dark:bg-[#272B2A] border-none rounded-full text-xs text-[#191C1B] dark:text-[#E1E3E0] placeholder-[#6F7976] focus:outline-none focus:ring-2 focus:ring-[#00695C]"
            />
          </div>
        </div>

        {/* Lead List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredLeads.map((lead) => {
            const isSelected = activeLead?.id === lead.id;
            return (
              <button
                key={lead.id}
                id={`btn-select-chat-${lead.id}`}
                onClick={() => onSelectLead(lead.id)}
                className={`w-full p-3 rounded-[20px] text-left transition-all flex items-center space-x-3 ${
                  isSelected
                    ? 'bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#E1E3E0] shadow-xs'
                    : 'hover:bg-[#ECEFEC]/60 dark:hover:bg-[#272B2A]/60 text-[#191C1B] dark:text-[#E1E3E0]'
                }`}
              >
                <div className={`w-9 h-9 rounded-full font-semibold text-xs flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-[#00695C] text-white' : 'bg-[#1F3A5F] text-white'
                }`}>
                  {lead.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold truncate">
                      {lead.name}
                    </p>
                    <span className="text-[10px] opacity-70">{lead.source}</span>
                  </div>
                  <p className="text-[11px] font-mono opacity-80 truncate">{lead.phone}</p>
                  <p className="text-[11px] opacity-60 truncate mt-0.5">{lead.notes || 'No notes'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active WhatsApp Conversation Thread */}
      {activeLead ? (
        <div className="flex-1 flex flex-col h-full bg-[#EFEAE2] dark:bg-[#0b141a]">
          {/* Chat Header */}
          <div className="h-16 px-5 bg-[#00201B] text-[#E1E3E0] flex items-center justify-between border-b border-[#3F4946]/30 z-10">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#00695C] text-white font-semibold text-sm flex items-center justify-center shadow-xs">
                {activeLead.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-sm truncate text-[#E1E3E0] m3-title-small">{activeLead.name}</h3>
                  <span className="text-[10px] bg-[#004F46] text-[#80D5C4] px-2 py-0.5 rounded-full font-medium">
                    {activeLead.stage}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-[#A2ADA9] font-mono">
                  <span>{activeLead.phone}</span>
                  <span>•</span>
                  <span className="text-[11px] text-[#80D5C4]">WhatsApp Verified</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Simulate Inbound Reply */}
              <button
                id="btn-simulate-reply"
                onClick={handleSimulateReply}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#00695C]/40 hover:bg-[#00695C] text-[#80D5C4] hover:text-white flex items-center space-x-1.5 transition-colors min-h-[36px]"
                title="Simulate incoming customer message on WhatsApp"
              >
                <Bot className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simulate Reply</span>
              </button>

              <button
                onClick={() => onStartCall(activeLead)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="Call lead"
              >
                <Phone className="w-4 h-4 text-[#80D5C4]" />
              </button>

              <button
                onClick={() => onOpenDetail(activeLead)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                title="View Full Profile"
              >
                <Info className="w-4 h-4 text-[#E1E3E0]" />
              </button>
            </div>
          </div>

          {/* Quick Reply Canned Templates Bar */}
          <div className="bg-[#F8FAF8]/95 dark:bg-[#1D201F]/95 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 px-4 py-2.5 flex items-center space-x-2 overflow-x-auto">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#6F7976] whitespace-nowrap flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Quick Templates:</span>
            </span>
            {QUICK_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                onClick={() => setInputText(tmpl.text)}
                className="text-xs px-3.5 py-1 rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] hover:bg-[#CCE8E1] dark:hover:bg-[#004F46] hover:text-[#00201B] dark:hover:text-[#80D5C4] transition-colors whitespace-nowrap font-medium text-[#191C1B] dark:text-[#E1E3E0]"
              >
                {tmpl.label}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {/* System Encryption Notice */}
            <div className="flex justify-center">
              <div className="bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[11px] px-4 py-1.5 rounded-full border border-amber-200 dark:border-amber-900/60 shadow-2xs max-w-md text-center">
                🔒 Messages are end-to-end simulated via WhatsApp Cloud API webhook delivery pipeline.
              </div>
            </div>

            {messages.map((msg) => {
              const isOutbound = msg.direction === 'outbound';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md sm:max-w-lg rounded-[22px] px-4 py-2.5 shadow-xs relative text-xs leading-relaxed ${
                      isOutbound
                        ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#191C1B] dark:text-[#E1E3E0] rounded-tr-xs'
                        : 'bg-white dark:bg-[#202c33] text-[#191C1B] dark:text-[#E1E3E0] rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <div className="flex items-center justify-end space-x-1.5 mt-1 text-[10px] text-[#6F7976] dark:text-[#C4C7C5]">
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {isOutbound && renderStatusTicks(msg.deliveryStatus, msg.retryCount)}
                    </div>
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && !isLoadingMessages && (
              <div className="text-center py-12 text-[#6F7976] text-xs">
                No WhatsApp messages yet. Select a quick template or type below to initiate outreach!
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Message Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-[#F8FAF8] dark:bg-[#1D201F] border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center space-x-2"
          >
            <input
              id="input-whatsapp-message"
              type="text"
              placeholder={`Message ${activeLead.name} on WhatsApp...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-5 py-3 bg-[#ECEFEC] dark:bg-[#272B2A] border-none rounded-full text-xs text-[#191C1B] dark:text-[#E1E3E0] focus:outline-none focus:ring-2 focus:ring-[#00695C]"
            />
            <button
              id="btn-send-whatsapp-message"
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="w-11 h-11 rounded-full bg-[#00695C] hover:bg-[#005449] disabled:opacity-50 text-white flex items-center justify-center shadow-xs transition-colors flex-shrink-0"
              title="Send WhatsApp message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#6F7976]">
          <MessageSquare className="w-12 h-12 text-[#BEC9C5] dark:text-[#3F4946] mb-3" />
          <h3 className="text-base font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
            No Lead Selected
          </h3>
          <p className="text-xs text-[#6F7976]">Pick a lead from the left pane to view conversation</p>
        </div>
      )}
      </div>
    </div>
  );
};
