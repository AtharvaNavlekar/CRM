import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  BarChart2,
  Sliders,
  Users2,
  ChevronRight,
  ChevronLeft,
  Share2,
  Table,
  CheckCircle,
  HelpCircle,
  Smartphone,
  Headphones,
  Sparkles,
  ArrowRight,
  X,
  Upload,
  Check,
  QrCode
} from 'lucide-react';

interface GettingStartedViewProps {
  onNavigateToLeads: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToLeaderboard: () => void;
}

export const GettingStartedView: React.FC<GettingStartedViewProps> = ({
  onNavigateToLeads,
  onNavigateToDashboard,
  onNavigateToLeaderboard
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Modals
  const [modalType, setModalType] = useState<
    'excel' | 'fields' | 'fb_guide' | 'sheets_guide' | 'app_download' | 'support' | null
  >(null);

  // Integration Connection State
  const [fbConnected, setFbConnected] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(true);

  const scrollNext = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  const scrollPrev = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Main Content Area */}
      <div className="flex-1 p-5 space-y-6 max-w-6xl">
        {/* Welcome Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-[#2E6E5C] dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/60">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workspace Setup &amp; Admin Hub</span>
          </div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Welcome to DialPulse CRM
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Empower your telesales team with high-velocity calling queues, WhatsApp Cloud API workflows, and live leaderboards.
          </p>
        </div>

        {/* Section 1: Horizontally-Scrollable Row of 3-4 "Getting Started" Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Essential Admin Setup Steps
            </h2>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={scrollPrev}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={scrollNext}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex items-stretch space-x-3.5 overflow-x-auto pb-2 scrollbar-none snap-x"
          >
            {/* Card 1: Excel Upload */}
            <div className="w-72 shrink-0 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between snap-start">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3 border border-emerald-200 dark:border-emerald-800/60">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Excel / CSV Upload</h3>
                <p className="text-xs text-slate-500 mt-1">Import your data flexibly with auto-mapped columns.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalType('excel')}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg bg-[#2E6E5C] text-white hover:bg-[#255a4b] transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Import Leads</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 2: Reports */}
            <div className="w-72 shrink-0 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between snap-start">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center mb-3 border border-sky-200 dark:border-sky-800/60">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Reports &amp; Analytics</h3>
                <p className="text-xs text-slate-500 mt-1">Analyse your team performance and pipeline conversions.</p>
              </div>
              <button
                type="button"
                onClick={onNavigateToDashboard}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-900 transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>View Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 3: Lead Fields */}
            <div className="w-72 shrink-0 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between snap-start">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-3 border border-purple-200 dark:border-purple-800/60">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Custom Lead Fields</h3>
                <p className="text-xs text-slate-500 mt-1">Create your custom lead fields for budget, CIBIL, project &amp; more.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalType('fields')}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Configure Fields</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Card 4: Team Quotas & Leaderboard */}
            <div className="w-72 shrink-0 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between snap-start">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3 border border-amber-200 dark:border-amber-800/60">
                  <Users2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Team Calling Quotas</h3>
                <p className="text-xs text-slate-500 mt-1">Set 60 calls/day targets and monitor connected call talk time.</p>
              </div>
              <button
                type="button"
                onClick={onNavigateToLeaderboard}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 transition-colors flex items-center justify-center space-x-1.5"
              >
                <span>Leaderboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Integrations (Two-up cards for Facebook & Google Sheets) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Lead Generation &amp; Spreadsheet Integrations
            </h2>
            <button
              type="button"
              onClick={() => alert('Viewing all 15+ integrations (IndiaMART, Justdial, Zapier, TradeIndia, Meta & Webhook APIs)')}
              className="text-xs font-bold text-[#2E6E5C] hover:underline flex items-center space-x-1"
            >
              <span>Explore All Integrations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Facebook Lead Ads Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center border border-blue-200 dark:border-blue-800/60 font-black text-base">
                    f
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Facebook Lead Ads</h3>
                    <p className="text-[11px] text-slate-500">Instant real-time capture from Meta ad forms</p>
                  </div>
                </div>

                {fbConnected ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Not Connected
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Connect your Meta Business Manager to automatically route buyer inquiries directly into telecallers’ queues within 2 seconds.
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setModalType('fb_guide')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How to use</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFbConnected(!fbConnected)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    fbConnected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      : 'bg-[#2E6E5C] text-white hover:bg-[#255a4b]'
                  }`}
                >
                  {fbConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Google Sheets Card */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800/60">
                    <Table className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Google Sheets</h3>
                    <p className="text-[11px] text-slate-500">Live 2-way spreadsheet synchronization</p>
                  </div>
                </div>

                {sheetsConnected ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                    Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Not Connected
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Sync existing marketing lead sheets automatically. Status updates, call logs, and WhatsApp delivery updates flow back into Google Sheets.
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setModalType('sheets_guide')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>How to use</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSheetsConnected(!sheetsConnected)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    sheetsConnected
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      : 'bg-[#2E6E5C] text-white hover:bg-[#255a4b]'
                  }`}
                >
                  {sheetsConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel: Native Apps & Proactive Support */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900 shrink-0 space-y-5">
        {/* Native Apps Promotion Panel */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-[#2E6E5C]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Native Mobile Apps
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Record client calls, sync SIM logs, and send WhatsApp templates on the go.
          </p>

          {/* Android Card */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Android Dialer APK</span>
              <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                SIM Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Auto-logs SIM dialer calls &amp; WhatsApp chats.</p>
            <button
              type="button"
              onClick={() => setModalType('app_download')}
              className="w-full py-1.5 px-2 text-xs font-bold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-black transition-colors"
            >
              Download for Android
            </button>
          </div>

          {/* iOS Card */}
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100">iOS Mobile App</span>
              <span className="text-[10px] uppercase font-bold text-sky-600 bg-sky-100 dark:bg-sky-950 px-1.5 py-0.5 rounded">
                Cloud VoIP
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Click-to-call &amp; push notification reminders.</p>
            <button
              type="button"
              onClick={() => setModalType('app_download')}
              className="w-full py-1.5 px-2 text-xs font-bold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-black transition-colors"
            >
              Download for iOS
            </button>
          </div>
        </div>

        {/* Proactive Support Nudge */}
        <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
          <div className="w-9 h-9 rounded-xl bg-[#2E6E5C] text-white flex items-center justify-center shadow-xs">
            <Headphones className="w-5 h-5" />
          </div>

          <div>
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
              Need help getting started?
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Our sales engineering specialists can guide your custom field mapping and WhatsApp template verification in 15 minutes.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalType('support')}
            className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-[#2E6E5C] text-white hover:bg-[#255a4b] transition-colors shadow-2xs"
          >
            Request Support
          </button>
        </div>
      </div>

      {/* Interactive Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                {modalType === 'excel' && 'Excel / CSV Lead Import'}
                {modalType === 'fields' && 'Custom Lead Fields Configuration'}
                {modalType === 'fb_guide' && 'Facebook Lead Ads Setup Guide'}
                {modalType === 'sheets_guide' && 'Google Sheets Synchronization Guide'}
                {modalType === 'app_download' && 'Mobile Apps Download'}
                {modalType === 'support' && 'Request Onboarding Specialist Support'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {modalType === 'excel' && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center space-y-2">
                    <Upload className="w-8 h-8 text-[#2E6E5C] mx-auto" />
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      Drag &amp; drop your customer roster here
                    </p>
                    <p className="text-[11px] text-slate-500">Supports .xlsx, .xls, and .csv files up to 50MB</p>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Columns like Name, Mobile Phone, Project/Product, and Assignee are automatically recognized.
                  </p>
                </div>
              )}

              {modalType === 'fields' && (
                <div className="space-y-2">
                  <p className="text-slate-600 dark:text-slate-400">
                    Active custom fields for your team:
                  </p>
                  <div className="space-y-1.5 font-mono">
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 flex justify-between">
                      <span>CIBIL Score</span>
                      <span className="text-slate-400">Number</span>
                    </div>
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 flex justify-between">
                      <span>Preferred 2BHK/3BHK</span>
                      <span className="text-slate-400">Dropdown</span>
                    </div>
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 flex justify-between">
                      <span>Annual Family Income</span>
                      <span className="text-slate-400">Currency</span>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'fb_guide' && (
                <div className="space-y-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">3-Step Meta Integration:</p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px]">
                    <li>Login to your Facebook Business Page &amp; Ads Manager.</li>
                    <li>Grant DialPulse CRM Lead Retrieval permissions.</li>
                    <li>Map instant callback notifications directly to your telecallers.</li>
                  </ol>
                </div>
              )}

              {modalType === 'sheets_guide' && (
                <div className="space-y-2 text-slate-600 dark:text-slate-400 leading-relaxed">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">Two-Way Live Sync:</p>
                  <p className="text-[11px]">
                    New rows added to your Google Spreadsheet are fetched every 60 seconds and queued into DialPulse.
                  </p>
                </div>
              )}

              {modalType === 'app_download' && (
                <div className="text-center space-y-3 py-2">
                  <div className="w-32 h-32 mx-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    <QrCode className="w-20 h-20 text-slate-700 dark:text-slate-300" />
                  </div>
                  <p className="text-[11px] text-slate-500">Scan this QR code with your mobile camera to install the field caller APK.</p>
                </div>
              )}

              {modalType === 'support' && (
                <div className="space-y-3">
                  <p className="text-slate-600 dark:text-slate-400">
                    Our onboarding team will contact you at your registered business phone number within 15 minutes.
                  </p>
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl font-semibold">
                    Support Ticket #DP-89201 created.
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#2E6E5C] text-white hover:bg-[#255a4b]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
