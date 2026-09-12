import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Phone,
  MessageSquare,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  Slash,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { LeadPreferences, PreferredChannel, PreferredTimeWindow } from '../../types';

interface LeadPreferencePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  leadPhone: string;
  leadCompanyOrProject?: string;
  currentPreferences?: LeadPreferences;
  onSavePreferences: (updatedPrefs: LeadPreferences) => void;
}

const DEFAULT_PREFS: LeadPreferences = {
  preferredChannel: 'Any',
  preferredTimeWindow: 'Morning (10 AM - 1 PM)',
  allowedTopics: ['New product offers', 'Payment & billing reminders only', 'Site visits & consultations'],
  isPaused30Days: false,
  pausedUntil: null,
  isOptedOut: false,
  optOutReason: '',
  updatedAt: new Date().toISOString()
};

export const LeadPreferencePortalModal: React.FC<LeadPreferencePortalModalProps> = ({
  isOpen,
  onClose,
  leadName,
  leadPhone,
  leadCompanyOrProject = 'Advisory Inquiry',
  currentPreferences,
  onSavePreferences
}) => {
  const initial = currentPreferences || DEFAULT_PREFS;

  const [channel, setChannel] = useState<PreferredChannel>(initial.preferredChannel || 'Any');
  const [timeWindow, setTimeWindow] = useState<PreferredTimeWindow>(initial.preferredTimeWindow || 'Morning (10 AM - 1 PM)');
  const [topics, setTopics] = useState<string[]>(initial.allowedTopics || ['New product offers']);
  const [isPaused, setIsPaused] = useState<boolean>(initial.isPaused30Days || false);
  const [isOptedOut, setIsOptedOut] = useState<boolean>(initial.isOptedOut || false);
  const [optOutReason, setOptOutReason] = useState<string>(initial.optOutReason || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggleTopic = (t: string) => {
    if (topics.includes(t)) {
      setTopics(topics.filter((item) => item !== t));
    } else {
      setTopics([...topics, t]);
    }
  };

  const handlePause30Days = () => {
    const pauseUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const updated: LeadPreferences = {
      preferredChannel: channel,
      preferredTimeWindow: timeWindow,
      allowedTopics: topics,
      isPaused30Days: true,
      pausedUntil: pauseUntil,
      isOptedOut: false,
      updatedAt: new Date().toISOString()
    };
    setIsPaused(true);
    setIsOptedOut(false);
    onSavePreferences(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handlePermanentOptOut = () => {
    const updated: LeadPreferences = {
      preferredChannel: 'Any',
      preferredTimeWindow: timeWindow,
      allowedTopics: [],
      isPaused30Days: false,
      pausedUntil: null,
      isOptedOut: true,
      optOutReason: optOutReason || 'Customer requested complete DND',
      updatedAt: new Date().toISOString()
    };
    setIsOptedOut(true);
    setIsPaused(false);
    onSavePreferences(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: LeadPreferences = {
      preferredChannel: channel,
      preferredTimeWindow: timeWindow,
      allowedTopics: topics,
      isPaused30Days: isPaused,
      pausedUntil: isPaused ? new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() : null,
      isOptedOut: isOptedOut,
      optOutReason: isOptedOut ? optOutReason : '',
      updatedAt: new Date().toISOString()
    };
    onSavePreferences(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-in fade-in">
      <div
        id="modal-lead-preference-portal"
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Mobile Portal Device Header Banner */}
        <div className="bg-gradient-to-r from-[#1F3A5F] to-[#2E6E5C] text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <span className="text-[10px] tracking-wider uppercase font-semibold text-emerald-300">
                  Customer Privacy & Preference Center
                </span>
                <h2 className="text-base font-bold text-white">Communications Choices</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              title="Close portal preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-white">{leadName}</p>
              <p className="text-[11px] text-slate-200 font-mono">{leadPhone} • {leadCompanyOrProject}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
              Verified Lead Portal
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAll} className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-100">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 font-semibold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Preferences successfully recorded! Your choices take effect immediately.</span>
            </div>
          )}

          {/* Quick 1-Tap Control Options: Equal prominence to opt-out & pause */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Quick Peace of Mind Controls
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePause30Days}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all text-left ${
                  isPaused
                    ? 'bg-amber-100 dark:bg-amber-950 border-amber-400 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-700 dark:text-slate-300'
                }`}
              >
                <PauseCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="font-bold">Pause Contact for 30 Days</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Temporary snooze on all marketing</div>
                </div>
              </button>

              <button
                type="button"
                onClick={handlePermanentOptOut}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all text-left ${
                  isOptedOut
                    ? 'bg-rose-100 dark:bg-rose-950 border-rose-400 text-rose-900 dark:text-rose-200 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-rose-400 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Slash className="w-4 h-4 text-rose-600 shrink-0" />
                <div>
                  <div className="font-bold">Permanent Opt-Out (DND)</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Never contact me for promotions</div>
                </div>
              </button>
            </div>

            {isPaused && (
              <div className="text-[11px] p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-medium">
                Active: Outbound calls and promotional WhatsApp messages are paused for the next 30 days.
              </div>
            )}
            {isOptedOut && (
              <div className="text-[11px] p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-medium">
                Active: Your phone number is registered on our internal Do-Not-Disturb registry.
              </div>
            )}
          </div>

          {/* Section 1: Preferred Contact Channel */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-2">
              1. How should we contact you?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Any' as PreferredChannel, label: 'Any Channel', icon: Sparkles },
                { id: 'WhatsApp' as PreferredChannel, label: 'WhatsApp Only', icon: MessageSquare },
                { id: 'Call' as PreferredChannel, label: 'Phone Call Only', icon: Phone },
                { id: 'SMS' as PreferredChannel, label: 'SMS Only', icon: Mail }
              ].map((opt) => {
                const Icon = opt.icon;
                const isSel = channel === opt.id && !isOptedOut;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setChannel(opt.id);
                      setIsOptedOut(false);
                    }}
                    className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center space-y-1.5 transition-all text-center ${
                      isSel
                        ? 'bg-[#1F3A5F] text-white border-[#1F3A5F] shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Selecting &quot;WhatsApp Only&quot; disables one-click phone dialing by reps to respect your time.
            </p>
          </div>

          {/* Section 2: Preferred Time Window */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-2">
              2. Best time to reach you
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'Morning (10 AM - 1 PM)',
                'Afternoon (2 PM - 5 PM)',
                'Evening (5 PM - 7 PM)',
                'Anytime'
              ].map((tw) => {
                const isSel = timeWindow === tw;
                return (
                  <button
                    key={tw}
                    type="button"
                    onClick={() => setTimeWindow(tw as PreferredTimeWindow)}
                    className={`p-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                      isSel
                        ? 'bg-[#2E6E5C] text-white border-[#2E6E5C]'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{tw}</span>
                    </div>
                    {isSel && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Allowed Topics */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block mb-2">
              3. Topics you are open to hearing about
            </label>
            <div className="space-y-2">
              {[
                { title: 'New product offers & launches', desc: 'Updates on new inventory, brochures and special rates' },
                { title: 'Payment & billing reminders only', desc: 'Critical milestones, receipt acknowledgments and statements' },
                { title: 'Site visits & consultations', desc: 'Property walkthroughs, counseling bookings and advisor follow-ups' }
              ].map((item) => {
                const checked = topics.includes(item.title);
                return (
                  <label
                    key={item.title}
                    onClick={() => handleToggleTopic(item.title)}
                    className="flex items-start space-x-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1F3A5F] hover:bg-[#182f4d] text-white flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <span>Save My Preferences</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
