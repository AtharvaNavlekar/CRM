import React, { useState } from 'react';
import {
  ShieldCheck,
  PhoneCall,
  Sliders,
  GitFork,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Upload,
  ArrowRight,
  TrendingUp,
  Download,
  Info,
  Building2,
  Phone,
  MessageSquare,
  Mail,
  FileSpreadsheet,
  Check,
  XCircle,
  HelpCircle,
  Eye,
  Lock
} from 'lucide-react';
import {
  CallerIdentityConfig,
  CallReasonTag,
  ContactFrequencyRules,
  ChannelRoutingRule,
  ComplianceWatchCategory,
  CallingNumberVerification
} from '../../types';
import {
  DEFAULT_CALLER_IDENTITY,
  DEFAULT_CALL_REASONS,
  DEFAULT_FREQUENCY_RULES,
  DEFAULT_CHANNEL_ROUTING_RULES,
  DEFAULT_COMPLIANCE_WATCH,
  VERIFIED_CALL_STATS
} from '../../data/mockSeedData';
import { LeadPreferencePortalModal } from './LeadPreferencePortalModal';

interface TrustComplianceViewProps {
  onOpenPortalForSampleLead?: () => void;
}

export const TrustComplianceView: React.FC<TrustComplianceViewProps> = () => {
  const [activeTab, setActiveTab] = useState<'verified_id' | 'frequency_rules' | 'preferences' | 'orchestration' | 'compliance_watch'>('verified_id');

  // Module 1 State: Identity & Calling Numbers
  const [callerIdentity, setCallerIdentity] = useState<CallerIdentityConfig>(DEFAULT_CALLER_IDENTITY);
  const [callReasons, setCallReasons] = useState<CallReasonTag[]>(DEFAULT_CALL_REASONS);
  const [isAddingReason, setIsAddingReason] = useState(false);
  const [newReasonName, setNewReasonName] = useState('');
  const [newReasonCategory, setNewReasonCategory] = useState<CallReasonTag['category']>('Loan Follow-up');
  const [newReasonStage, setNewReasonStage] = useState('Follow-up');
  const [newReasonCampaign, setNewReasonCampaign] = useState('General Campaign');
  const [newReasonIsHighScrutiny, setNewReasonIsHighScrutiny] = useState(false);

  // Module 2 State: Frequency Rules
  const [frequencyRules, setFrequencyRules] = useState<ContactFrequencyRules>(DEFAULT_FREQUENCY_RULES);
  const [rulesFeedback, setRulesFeedback] = useState('');

  // Module 4 State: Channel Routing
  const [routingRules, setRoutingRules] = useState<ChannelRoutingRule[]>(DEFAULT_CHANNEL_ROUTING_RULES);
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [newRouteStage, setNewRouteStage] = useState('Payment Pending');
  const [newRoutePrimary, setNewRoutePrimary] = useState<'WhatsApp' | 'Call' | 'SMS'>('WhatsApp');
  const [newRouteWaitHours, setNewRouteWaitHours] = useState(24);
  const [newRouteFallback, setNewRouteFallback] = useState<'Call' | 'WhatsApp' | 'SMS' | 'None'>('Call');
  const [newRouteCondition, setNewRouteCondition] = useState<ChannelRoutingRule['triggerCondition']>('No response');

  // Module 5 State: Compliance Watch
  const [complianceWatchList, setComplianceWatchList] = useState<ComplianceWatchCategory[]>(DEFAULT_COMPLIANCE_WATCH);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditExportStatus, setAuditExportStatus] = useState<'idle' | 'generating' | 'ready'>('idle');

  // Lead Portal Tester Modal
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [portalFeedback, setPortalFeedback] = useState('');

  // Calculate current quiet hours active/inactive
  const now = new Date();
  const currentHour = now.getHours();
  // Quiet hours: 19:00 (7 PM) to 09:00 (9 AM)
  const isCurrentlyQuietHours = currentHour >= 19 || currentHour < 9;

  const handleAddCallReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonName.trim()) return;

    const newTag: CallReasonTag = {
      id: `cr-${Date.now()}`,
      name: newReasonName.trim(),
      category: newReasonCategory,
      attachedStage: newReasonStage,
      campaign: newReasonCampaign,
      isHighScrutiny: newReasonIsHighScrutiny,
      requiredForDialing: true,
      description: `Mandatory declared purpose tag for ${newReasonStage}.`,
      activeCallsCount: 0
    };

    setCallReasons([newTag, ...callReasons]);
    setNewReasonName('');
    setIsAddingReason(false);
  };

  const handleSaveFrequencyRules = (e: React.FormEvent) => {
    e.preventDefault();
    setRulesFeedback('Contact frequency rules & fatigue caps saved successfully!');
    setTimeout(() => setRulesFeedback(''), 3000);
  };

  const handleAddRoutingRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: ChannelRoutingRule = {
      id: `crr-${Date.now()}`,
      pipelineStageOrCampaign: newRouteStage,
      primaryChannel: newRoutePrimary,
      waitPeriodHours: newRouteWaitHours,
      fallbackChannel: newRouteFallback,
      triggerCondition: newRouteCondition,
      active: true,
      notes: `Orchestrated: ${newRoutePrimary} first, wait ${newRouteWaitHours}h, fallback to ${newRouteFallback} on ${newRouteCondition}.`
    };

    setRoutingRules([newRule, ...routingRules]);
    setIsAddingRoute(false);
  };

  const handleToggleRoute = (id: string) => {
    setRoutingRules(routingRules.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const handleTriggerAuditExport = () => {
    setIsAuditModalOpen(true);
    setAuditExportStatus('generating');
    setTimeout(() => {
      setAuditExportStatus('ready');
    }, 1400);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Trust & Compliance Engine</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Enforcing
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dialer-level consumer protection: Verified caller identity, fatigue guardrails, preference portals, and category audit trails.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsPortalModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1F3A5F] hover:bg-[#182f4d] text-white flex items-center space-x-2 shadow-xs transition-all"
          >
            <Eye className="w-3.5 h-3.5 text-teal-300" />
            <span>Preview Lead Preference Portal</span>
          </button>
          <button
            onClick={handleTriggerAuditExport}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 flex items-center space-x-2 shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export for Audit</span>
          </button>
        </div>
      </div>

      {/* Lift Highlight Callout Banner (Twilio research: 62% vs 20% answer rate) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-100">
            <span>Verified Caller ID Answer Rate</span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Research Proven</span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold">{VERIFIED_CALL_STATS.verifiedAnswerRate}%</span>
            <span className="text-xs text-emerald-200 font-semibold">vs 20.8% unverified</span>
          </div>
          <p className="text-[11px] text-emerald-100 mt-1">
            Triples pick-up rates when registered company name and logo display before answer.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Fatigue Blocks Today</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {VERIFIED_CALL_STATS.blockedAttemptsToday}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">auto-blocked</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Prevented rep calls to leads at or exceeding the 3-attempt/7-day cap.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Leads at Fatigue Risk</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {VERIFIED_CALL_STATS.leadsNearCapCount + VERIFIED_CALL_STATS.leadsAtCapCount}
            </span>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
              ({VERIFIED_CALL_STATS.leadsAtCapCount} capped)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Warning pills surfaced at point of dial to protect relationship health.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>Quiet Hours Dialing</span>
            <span className={`w-2.5 h-2.5 rounded-full ${isCurrentlyQuietHours ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">
              {isCurrentlyQuietHours ? 'Quiet Hours Active' : 'Day Window Active'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {isCurrentlyQuietHours
              ? 'Calls restricted until 09:00 AM IST (local comfort window).'
              : 'Outbound calling allowed (09:00 AM – 07:00 PM IST).'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none gap-2">
        {[
          { id: 'verified_id', label: '1. Verified Caller ID & Setup', icon: PhoneCall },
          { id: 'frequency_rules', label: '2. Contact Rules & Fatigue Caps', icon: Sliders },
          { id: 'preferences', label: '3. Consumer Preference Center', icon: ShieldCheck },
          { id: 'orchestration', label: '4. Channel Orchestration', icon: GitFork },
          { id: 'compliance_watch', label: '5. Compliance Watch & Risk', icon: AlertTriangle }
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-3 px-4 text-xs font-bold flex items-center space-x-2 border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-[#2E6E5C] text-[#2E6E5C] dark:text-emerald-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* MODULE 1: Verified Caller ID & Branded Calling Setup */}
      {activeTab === 'verified_id' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Step 1: Business Identity Verification Form */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Business Identity Verification Form</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Step 1 of 3
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Information registered with Indian telecom carriers and STIR/SHAKEN Level-A attestation registries.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Legal Business Name (from MCA / GSTIN)
                </label>
                <input
                  type="text"
                  value={callerIdentity.legalBusinessName}
                  onChange={(e) => setCallerIdentity({ ...callerIdentity, legalBusinessName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Caller ID Display Name (shown on consumer phones)
                </label>
                <input
                  type="text"
                  value={callerIdentity.displayName}
                  onChange={(e) => setCallerIdentity({ ...callerIdentity, displayName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Corporate CIN / Registration Number
                </label>
                <input
                  type="text"
                  value={callerIdentity.registrationNumber}
                  onChange={(e) => setCallerIdentity({ ...callerIdentity, registrationNumber: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Corporate Website Domain
                </label>
                <input
                  type="text"
                  value={callerIdentity.businessWebsite}
                  onChange={(e) => setCallerIdentity({ ...callerIdentity, businessWebsite: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>
            </div>

            {/* Logo Preview & Carrier Branding Mock */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <img
                  src={callerIdentity.logoUrl}
                  alt="Caller logo"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-300 dark:border-slate-600 shadow-xs"
                />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Verified Logo & Caller Card
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Displays on iOS and Android dialer screens during ringing
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                >
                  Replace Logo
                </button>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>CNAM Registered</span>
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Verification Status Dashboard per Calling Number */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Verification Status Dashboard</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Step 2 of 3
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Attestation and verification status per calling DID. Plain-language explanation of capabilities unlocked.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {callerIdentity.callingNumbers.map((num) => {
                const isVer = num.status === 'Verified';
                const isAct = num.status === 'Action Required';
                return (
                  <div
                    key={num.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isVer
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800'
                        : isAct
                        ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                        : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-base font-bold text-slate-900 dark:text-white font-mono">
                          {num.number}
                        </span>
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                          {num.label}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                          isVer
                            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                            : isAct
                            ? 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                            : 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                        }`}
                      >
                        {isVer ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {num.status}
                      </span>
                    </div>

                    {/* Plain Language Explanation of what Verified unlocks */}
                    <div className="mt-3 p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        {isVer ? 'What "Verified" Unlocks for this Line:' : 'Action Needed to Unlock Verified Caller ID:'}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        {isVer
                          ? 'Your business name, green shield badge, and logo display before the recipient answers. Verified Answer Rate: 64% (vs. 21% unverified).'
                          : isAct
                          ? 'Carrier DID lacks verified CNAM registration token. Dialing from this number will display as "Potential Spam" on consumer handsets.'
                          : 'SIP trunk verification in progress with Vodafone Idea Business. Expected attestation upgrade within 24 hours.'}
                      </p>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      <span>Attestation: {num.attestationLevel}</span>
                      <span>Carrier: {num.carrier.split('/')[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Call Reason Library (Required Before Dialing) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Call Reason Library & Campaign Attachment</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Step 3 of 3
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ~80%+ of consumers say knowing &quot;who&apos;s calling and why&quot; matters. Enforce declared call reason before a campaign can dial out.
                </p>
              </div>

              <button
                onClick={() => setIsAddingReason(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#2E6E5C] hover:bg-[#255b4c] text-white flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Call Reason Tag</span>
              </button>
            </div>

            {/* Strict Enforcement Notice */}
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Strict Dialing Enforcement:</strong> Reps and auto-dialers cannot dial out unless an approved Call Reason tag is attached to the pipeline stage or campaign.
              </span>
            </div>

            {isAddingReason && (
              <form onSubmit={handleAddCallReason} className="p-4 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">New Declared Call Reason Tag</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Reason Tag Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Loan sanction follow-up"
                      value={newReasonName}
                      onChange={(e) => setNewReasonName(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Pipeline Stage</label>
                    <select
                      value={newReasonStage}
                      onChange={(e) => setNewReasonStage(e.target.value)}
                      className="w-full text-xs p-2 m3-select"
                    >
                      <option value="Fresh Lead">Fresh Lead</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Quotation Shared">Quotation Shared</option>
                      <option value="Payment Pending">Payment Pending</option>
                      <option value="Reheated">Reheated</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Category</label>
                    <select
                      value={newReasonCategory}
                      onChange={(e) => setNewReasonCategory(e.target.value as any)}
                      className="w-full text-xs p-2 m3-select"
                    >
                      <option value="Loan Follow-up">Loan Follow-up</option>
                      <option value="Payment & Billing">Payment & Billing</option>
                      <option value="Product Demo">Product Demo</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Debt Resolution & Recovery">Debt Resolution & Recovery (High Scrutiny)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <label className="flex items-center space-x-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newReasonIsHighScrutiny}
                      onChange={(e) => setNewReasonIsHighScrutiny(e.target.checked)}
                      className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-rose-700 dark:text-rose-400">Flag as High-Scrutiny (requires compliance recording & explicit consent script)</span>
                  </label>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-800"
                  >
                    Save & Attach to Campaign
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingReason(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* List of active Call Reason tags */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {callReasons.map((cr) => (
                <div key={cr.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{cr.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {cr.category}
                      </span>
                      {cr.isHighScrutiny && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center space-x-1">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>High-Scrutiny Audit</span>
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-3">
                      <span>Attached Stage: <strong>{cr.attachedStage}</strong></span>
                      <span>•</span>
                      <span>Campaign: <strong>{cr.campaign}</strong></span>
                      <span>•</span>
                      <span className="text-teal-600 dark:text-teal-400 font-semibold">{cr.activeCallsCount} calls logged</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    Dialing Approved
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 2: Contact Frequency & Fatigue Guardrails */}
      {activeTab === 'frequency_rules' && (
        <form onSubmit={handleSaveFrequencyRules} className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Contact Frequency Caps per Channel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Research finding: 56% unsubscribe after 4+ marketing messages in 30 days. Hard caps prevent agent fatigue before outreach occurs.
                </p>
              </div>

              {rulesFeedback && (
                <div className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {rulesFeedback}
                </div>
              )}
            </div>

            {/* Configurable Caps: Call, WhatsApp, SMS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Phone Call Cap */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Phone className="w-4 h-4 text-teal-600" />
                  <span>Outbound Voice Calls</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Do not contact the same lead more than:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={frequencyRules.callCapMaxAttempts}
                      onChange={(e) => setFrequencyRules({ ...frequencyRules, callCapMaxAttempts: Number(e.target.value) })}
                      className="w-16 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">times</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">within</span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={frequencyRules.callCapDays}
                      onChange={(e) => setFrequencyRules({ ...frequencyRules, callCapDays: Number(e.target.value) })}
                      className="w-16 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">rolling days</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                  Exceeding this locks the Call button on the lead record with an explanatory warning badge.
                </p>
              </div>

              {/* WhatsApp Cap */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp Outreach</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Do not contact the same lead more than:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={frequencyRules.whatsAppCapMaxAttempts}
                      onChange={(e) => setFrequencyRules({ ...frequencyRules, whatsAppCapMaxAttempts: Number(e.target.value) })}
                      className="w-16 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">times</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">within</span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={frequencyRules.whatsAppCapDays}
                      onChange={(e) => setFrequencyRules({ ...frequencyRules, whatsAppCapDays: Number(e.target.value) })}
                      className="w-16 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">rolling days</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                  Matches research benchmark (max 4 per 30 days) to prevent WhatsApp spam flags.
                </p>
              </div>

              {/* SMS Cap */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span>SMS Nudges</span>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Do not contact the same lead more than:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={frequencyRules.smsCapMaxAttempts}
                      onChange={(e) => setFrequencyRules({ ...frequencyRules, smsCapMaxAttempts: Number(e.target.value) })}
                      className="w-16 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">times</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">within</span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={frequencyRules.smsCapDays}
                      onChange={(e) => setFrequencyRules({ ...frequencyRules, smsCapDays: Number(e.target.value) })}
                      className="w-16 text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-center"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-300">rolling days</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                  DLT transactional gateway compliance cap.
                </p>
              </div>
            </div>

            {/* Quiet Hours Configuration */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Quiet Hours Setting (No Outbound Contact)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={frequencyRules.quietHoursEnabled}
                    onChange={(e) => setFrequencyRules({ ...frequencyRules, quietHoursEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span>Block all automated and manual outbound contact before</span>
                <input
                  type="time"
                  value={frequencyRules.quietHoursEnd}
                  onChange={(e) => setFrequencyRules({ ...frequencyRules, quietHoursEnd: e.target.value })}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
                <span>and after</span>
                <input
                  type="time"
                  value={frequencyRules.quietHoursStart}
                  onChange={(e) => setFrequencyRules({ ...frequencyRules, quietHoursStart: e.target.value })}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
                <span className="text-slate-500 dark:text-slate-400">({frequencyRules.enforceTimezone})</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#1F3A5F] hover:bg-[#182f4d] text-white flex items-center space-x-2 shadow-xs transition-all"
              >
                <span>Save Fatigue Guardrail Rules</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* MODULE 3: Preference Center (Admin View + Portal Tester) */}
      {activeTab === 'preferences' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lead-Facing Preference Center Management
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Consumers prefer opt-in with a visible, editable preference center (Amazon India model) over blanket consent.
                </p>
              </div>

              <button
                onClick={() => setIsPortalModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2E6E5C] hover:bg-[#255b4c] text-white flex items-center space-x-2 shadow-xs transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-teal-200" />
                <span>Launch Interactive Lead Portal</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">WhatsApp-Only Preference</div>
                <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">18 Leads</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Calls disabled on record; reps prompted with direct WhatsApp template button instead.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">30-Day Pause Active</div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">8 Leads</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Both voice and messaging channels locked with automatic resumption countdown timer.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Permanent DND Opt-Out</div>
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">6 Leads</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  1-tap opt-out honored across all campaigns and team members permanently.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                How Preferences Protect Reps &amp; Brand
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                When a lead states their channel preference via their personal link, DialPulse immediately updates the lead record. If a rep attempts to dial a lead who selected &quot;WhatsApp Only&quot;, the dial button is grayed out with a clear explanation: <em>&quot;Call disabled: Lead opted for WhatsApp only&quot;</em>. This guarantees reps never violate customer wishes by mistake.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODULE 4: Channel Orchestration Rules */}
      {activeTab === 'orchestration' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Channel Orchestration & Escalation Flow Designer
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Research finding: Text is preferred over calls for payment nudges & reminders (35% vs 29%). Define default channel and fallback paths without code.
                </p>
              </div>

              <button
                onClick={() => setIsAddingRoute(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#2E6E5C] hover:bg-[#255b4c] text-white flex items-center space-x-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Orchestration Flow</span>
              </button>
            </div>

            {isAddingRoute && (
              <form onSubmit={handleAddRoutingRule} className="p-4 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50/40 dark:bg-teal-950/30 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Add Stage Channel Escalation Flow</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Stage or Campaign</label>
                    <input
                      type="text"
                      value={newRouteStage}
                      onChange={(e) => setNewRouteStage(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Primary Channel (First)</label>
                    <select
                      value={newRoutePrimary}
                      onChange={(e) => setNewRoutePrimary(e.target.value as any)}
                      className="w-full text-xs p-2 m3-select"
                    >
                      <option value="WhatsApp">WhatsApp (Text-first)</option>
                      <option value="Call">Phone Call</option>
                      <option value="SMS">SMS</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Wait Period</label>
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={newRouteWaitHours}
                        onChange={(e) => setNewRouteWaitHours(Number(e.target.value))}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <span className="text-xs text-slate-500">hours</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Fallback Escalation</label>
                    <select
                      value={newRouteFallback}
                      onChange={(e) => setNewRouteFallback(e.target.value as any)}
                      className="w-full text-xs p-2 m3-select"
                    >
                      <option value="Call">Phone Call</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="SMS">SMS</option>
                      <option value="None">None (Halt)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-700 text-white hover:bg-teal-800"
                  >
                    Save Orchestration Rule
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingRoute(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Visual Horizontal Flow Cards */}
            <div className="space-y-3">
              {routingRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all ${
                    rule.active
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {rule.pipelineStageOrCampaign}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Trigger: {rule.triggerCondition}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleRoute(rule.id)}
                        className={`text-xs px-2.5 py-1 rounded-md font-bold transition-colors ${
                          rule.active
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {rule.active ? 'Active Rule' : 'Paused'}
                      </button>
                    </div>
                  </div>

                  {/* Horizontal visual pipeline */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Step 1 */}
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-bold flex items-center space-x-2">
                      {rule.primaryChannel === 'WhatsApp' ? (
                        <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : rule.primaryChannel === 'Call' ? (
                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span>Primary: {rule.primaryChannel} First</span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                    {/* Step 2 Wait Period */}
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Wait {rule.waitPeriodHours} Hours</span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                    {/* Step 3 Fallback */}
                    <div className="p-2.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 font-bold flex items-center space-x-2">
                      {rule.fallbackChannel === 'Call' ? (
                        <Phone className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : rule.fallbackChannel === 'WhatsApp' ? (
                        <MessageSquare className="w-4 h-4 text-teal-600 shrink-0" />
                      ) : (
                        <Mail className="w-4 h-4 text-teal-600 shrink-0" />
                      )}
                      <span>Fallback: {rule.fallbackChannel}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 italic">
                    &quot;{rule.notes}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODULE 5: Compliance Watch & Risk Dashboard */}
      {activeTab === 'compliance_watch' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Compliance Watch: Category Risk & Audit Scrutiny
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                    FTC Benchmark
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Debt-reduction complaints rose +85% YoY industry-wide. High-scrutiny categories are flagged in amber/red for proactive managerial supervision.
                </p>
              </div>

              <button
                onClick={handleTriggerAuditExport}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1F3A5F] hover:bg-[#182f4d] text-white flex items-center space-x-2 shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5 text-teal-300" />
                <span>Export for Audit</span>
              </button>
            </div>

            {/* List of categories with trend sparkline and scrutiny badges */}
            <div className="space-y-3">
              {complianceWatchList.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-4 rounded-xl border transition-all ${
                    cat.isHighScrutiny
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {cat.categoryName}
                        </span>
                        {cat.isHighScrutiny && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-rose-700 dark:text-rose-300" />
                            <span>High-Scrutiny Risk ({cat.complaintRiskScore})</span>
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Last reviewed on: {cat.lastAuditDate}
                      </div>
                    </div>

                    <div className="flex items-center space-x-5">
                      {/* Trend Points Visualization */}
                      <div className="flex items-end space-x-1 h-8 px-2 py-1 bg-white/60 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                        {cat.trendPoints.map((pt, idx) => {
                          const max = Math.max(...cat.trendPoints);
                          const heightPct = Math.max(20, Math.round((pt / max) * 100));
                          return (
                            <div
                              key={idx}
                              title={`Volume: ${pt}`}
                              style={{ height: `${heightPct}%` }}
                              className={`w-2 rounded-xs ${
                                cat.isHighScrutiny ? 'bg-rose-500' : 'bg-teal-500'
                              }`}
                            />
                          );
                        })}
                      </div>

                      <div className="text-right">
                        <div className="text-base font-extrabold text-slate-900 dark:text-white">
                          {cat.volumeCount} calls
                        </div>
                        <div
                          className={`text-xs font-bold flex items-center justify-end space-x-0.5 ${
                            cat.volumeChangePercent > 0
                              ? cat.isHighScrutiny
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>{cat.volumeChangePercent > 0 ? `+${cat.volumeChangePercent}%` : `${cat.volumeChangePercent}%`} YoY</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit Flags */}
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    {cat.flaggedReasons.map((reason, rIdx) => (
                      <div key={rIdx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.isHighScrutiny ? 'bg-rose-500' : 'bg-teal-500'}`} />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export for Audit Modal Dialog */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compliance Audit Package</h3>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {auditExportStatus === 'generating' ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Compiling verified call logs, STIR/SHAKEN certificates &amp; opt-out records...
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium">
                  Audit package generated: <strong>compliance_audit_log_20260906.zip</strong> (includes call metadata, declared reasons, DND registry matches, and carrier CNAM attestations).
                </div>
                <div className="space-y-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  <div>• SHA-256 Signature: 8f9b...a120c</div>
                  <div>• Scope: 124 leads, 494 attempted calls</div>
                  <div>• Quiet Hours Violations: 0 (100% compliant)</div>
                  <div>• Frequency Cap Violations: 0 (100% compliant)</div>
                </div>

                <div className="pt-3 flex justify-end space-x-2">
                  <button
                    onClick={() => setIsAuditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1F3A5F] text-white hover:bg-[#182f4d]"
                  >
                    Download Archive (Simulated)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lead Preference Portal Tester Modal */}
      <LeadPreferencePortalModal
        isOpen={isPortalModalOpen}
        onClose={() => setIsPortalModalOpen(false)}
        leadName="Rajesh Singhania"
        leadPhone="+91 98201 1073"
        leadCompanyOrProject="Godrej Horizon 3BHK"
        onSavePreferences={(updatedPrefs) => {
          setPortalFeedback('Preference updated in CRM state: ' + updatedPrefs.preferredChannel);
        }}
      />
    </div>
  );
};
