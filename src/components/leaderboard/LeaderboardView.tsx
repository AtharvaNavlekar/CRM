import React, { useState, useMemo } from 'react';
import {
  MOCK_LEADERBOARD,
  LeaderboardMember,
  TEAM_TOTAL_STATS
} from '../../data/mockSeedData';
import { AvatarBadge } from '../common/AvatarBadge';
import {
  Trophy,
  Calendar,
  Search,
  Download,
  PhoneCall,
  CheckCircle2,
  Clock,
  MessageSquare,
  TrendingUp,
  User,
  Users,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Filter,
  Medal
} from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  // Tabs: Day / Week / Month / Year
  const [periodTab, setPeriodTab] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Month');
  const [dateValue, setDateValue] = useState('2026-09-04');
  const [categoryFilter, setCategoryFilter] = useState('Sales');
  const [teammateSearch, setTeammateSearch] = useState('');

  // Selected Member for Right Detail Panel (or null = Team Total Stats)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  // Multiplier by periodTab
  const periodMultiplier = useMemo(() => {
    switch (periodTab) {
      case 'Day': return 0.15;
      case 'Week': return 0.35;
      case 'Year': return 4.5;
      default: return 1.0; // Month
    }
  }, [periodTab]);

  // Filtered & Scaled Members
  const displayedMembers = useMemo(() => {
    return MOCK_LEADERBOARD.filter((m) =>
      m.name.toLowerCase().includes(teammateSearch.toLowerCase()) ||
      m.role.toLowerCase().includes(teammateSearch.toLowerCase())
    ).map((m, idx) => {
      const calls = Math.round(m.calls * periodMultiplier);
      const mins = Math.round(m.durationMinutes * periodMultiplier);
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      const sales = Math.round(m.sales * periodMultiplier);
      const salesFormatted = sales >= 100000 ? `₹ ${(sales / 100000).toFixed(1)} L` : `₹ ${sales.toLocaleString('en-IN')}`;

      return {
        ...m,
        calls,
        durationFormatted: `${hours}h ${remMins.toString().padStart(2, '0')}m`,
        sales,
        salesFormatted,
        callsDetail: {
          ...m.callsDetail,
          allCalls: calls,
          incoming: Math.round(m.callsDetail.incoming * periodMultiplier),
          outgoing: Math.round(m.callsDetail.outgoing * periodMultiplier),
          missed: Math.round(m.callsDetail.missed * periodMultiplier),
          connected60sPlus: Math.round(m.callsDetail.connected60sPlus * periodMultiplier),
          attemptedCalls: calls
        },
        tasksDetail: {
          late: Math.round(m.tasksDetail.late * periodMultiplier),
          pending: Math.round(m.tasksDetail.pending * periodMultiplier),
          done: Math.round(m.tasksDetail.done * periodMultiplier),
          created: Math.round(m.tasksDetail.created * periodMultiplier)
        },
        whatsAppDetail: {
          ...m.whatsAppDetail,
          incoming: Math.round(m.whatsAppDetail.incoming * periodMultiplier),
          outgoing: Math.round(m.whatsAppDetail.outgoing * periodMultiplier)
        }
      };
    });
  }, [teammateSearch, periodMultiplier]);

  // Find currently selected member object, or fallback to team aggregated
  const selectedMember = useMemo(() => {
    if (!selectedMemberId) return null;
    return displayedMembers.find((m) => m.id === selectedMemberId) || null;
  }, [selectedMemberId, displayedMembers]);

  // Aggregated Team Stats
  const teamStats = useMemo(() => {
    const totalCalls = displayedMembers.reduce((acc, m) => acc + m.calls, 0);
    const totalSales = displayedMembers.reduce((acc, m) => acc + m.sales, 0);
    const totalDurationMins = displayedMembers.reduce((acc, m) => acc + m.durationMinutes * periodMultiplier, 0);
    const h = Math.floor(totalDurationMins / 60);
    const m = Math.round(totalDurationMins % 60);

    const incoming = displayedMembers.reduce((acc, m) => acc + m.callsDetail.incoming, 0);
    const outgoing = displayedMembers.reduce((acc, m) => acc + m.callsDetail.outgoing, 0);
    const missed = displayedMembers.reduce((acc, m) => acc + m.callsDetail.missed, 0);
    const connected60sPlus = displayedMembers.reduce((acc, m) => acc + m.callsDetail.connected60sPlus, 0);
    const attemptedCalls = totalCalls;

    const tasksLate = displayedMembers.reduce((acc, m) => acc + m.tasksDetail.late, 0);
    const tasksPending = displayedMembers.reduce((acc, m) => acc + m.tasksDetail.pending, 0);
    const tasksDone = displayedMembers.reduce((acc, m) => acc + m.tasksDetail.done, 0);
    const tasksCreated = displayedMembers.reduce((acc, m) => acc + m.tasksDetail.created, 0);

    const waIncoming = displayedMembers.reduce((acc, m) => acc + m.whatsAppDetail.incoming, 0);
    const waOutgoing = displayedMembers.reduce((acc, m) => acc + m.whatsAppDetail.outgoing, 0);

    return {
      totalCalls,
      distinctRepsCount: displayedMembers.length,
      totalDurationFormatted: `${h}h ${m.toString().padStart(2, '0')}m`,
      totalSalesFormatted: totalSales >= 100000 ? `₹ ${(totalSales / 100000).toFixed(1)} L` : `₹ ${totalSales.toLocaleString('en-IN')}`,
      firstCallTime: '09:05 AM',
      lastCallTime: '07:15 PM',
      incomingCalls: incoming,
      outgoingCalls: outgoing,
      missedCalls: missed,
      connected60sPlus,
      attemptedCalls,
      tasks: {
        late: tasksLate,
        pending: tasksPending,
        done: tasksDone,
        created: tasksCreated
      },
      whatsApp: {
        incoming: waIncoming,
        outgoing: waOutgoing,
        deliveryRate: '98.7%'
      }
    };
  }, [displayedMembers, periodMultiplier]);

  // Export handler
  const handleExportData = () => {
    alert(`Exported leaderboard metrics (${periodTab} period) to CSV!`);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-[#F8FAF8] dark:bg-[#111413] overflow-hidden rounded-[28px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-xs">
      {/* LEFT PANEL: Filters, Summary & Ranked Team Member List */}
      <div className="w-full lg:w-[58%] border-r border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex flex-col h-full bg-[#F8FAF8] dark:bg-[#1D201F] shrink-0">
        {/* Top Controls Toolbar */}
        <div className="p-4 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 space-y-3 bg-[#F8FAF8] dark:bg-[#1D201F]">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Day / Week / Month / Year Segmented Tabs */}
            <div className="flex items-center p-1 bg-[#ECEFEC] dark:bg-[#272B2A] rounded-full space-x-1">
              {(['Day', 'Week', 'Month', 'Year'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setPeriodTab(tab)}
                  className={`px-3.5 py-1 text-xs font-medium rounded-full transition-all ${
                    periodTab === tab
                      ? 'bg-[#00695C] text-white shadow-xs'
                      : 'text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Date Picker & Category Filter */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="h-8 px-3 text-xs font-medium rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] border-none text-[#191C1B] dark:text-[#E1E3E0] focus:outline-none focus:ring-1 focus:ring-[#00695C]"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 px-3 text-xs font-medium rounded-full border-none m3-select"
              >
                <option value="Sales">Sales (All)</option>
                <option value="Inbound">Inbound Telesales</option>
                <option value="Loan">Loan Advisory</option>
                <option value="RealEstate">Real Estate Desk</option>
              </select>
            </div>
          </div>

          {/* Search by teammate field */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#6F7976] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search teammate by name or role..."
              value={teammateSearch}
              onChange={(e) => setTeammateSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3.5 text-xs rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] border-none text-[#191C1B] dark:text-[#E1E3E0] placeholder-[#6F7976] focus:outline-none focus:ring-2 focus:ring-[#00695C]"
            />
          </div>

          {/* "Total Stats" Summary Card (Calls / Duration / Sales, plus "Team size: N") */}
          <div
            onClick={() => setSelectedMemberId(null)}
            className={`p-4 rounded-[22px] border transition-all cursor-pointer ${
              selectedMemberId === null
                ? 'bg-[#CCE8E1]/60 dark:bg-[#004F46]/30 border-[#00695C] shadow-xs'
                : 'bg-[#F8FAF8] dark:bg-[#1D201F] border-[#BEC9C5]/40 dark:border-[#3F4946]/40 hover:border-[#00695C]/40'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-full bg-[#00695C] text-white">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-[#191C1B] dark:text-[#E1E3E0] m3-title-small">
                    Total Team Performance
                  </span>
                  <span className="text-[10px] text-[#6F7976] ml-2 font-mono">
                    Team size: {displayedMembers.length} reps
                  </span>
                </div>
              </div>
              {selectedMemberId === null && (
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#00201B] dark:text-[#80D5C4] bg-[#CCE8E1] dark:bg-[#004F46] px-2.5 py-0.5 rounded-full">
                  Active View
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 font-mono">
              <div>
                <div className="text-[10px] uppercase font-medium text-[#6F7976]">Calls</div>
                <div className="text-xs font-bold text-[#191C1B] dark:text-[#E1E3E0]">
                  {teamStats.totalCalls}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-medium text-[#6F7976]">Duration</div>
                <div className="text-xs font-bold text-[#191C1B] dark:text-[#E1E3E0]">
                  {teamStats.totalDurationFormatted}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-medium text-[#6F7976]">Sales</div>
                <div className="text-xs font-bold text-[#00695C] dark:text-[#80D5C4]">
                  {teamStats.totalSalesFormatted}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ranked, Scrollable List of Team Members */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayedMembers.map((member, index) => {
            const isSelected = selectedMemberId === member.id;
            const rank = index + 1;

            return (
              <div
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                className={`p-3 rounded-[20px] flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#E1E3E0] shadow-xs'
                    : 'hover:bg-[#ECEFEC]/60 dark:hover:bg-[#272B2A]/60 text-[#191C1B] dark:text-[#E1E3E0]'
                }`}
              >
                {/* Left: Rank Badge + Avatar + Name + Timestamps */}
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Distinct Visual Rank Badge (Gold #1, Silver #2, Bronze #3) */}
                  <div className="w-7 text-center shrink-0">
                    {rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs shadow-xs" title="Rank 1: Gold">
                        🥇
                      </span>
                    ) : rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-xs" title="Rank 2: Silver">
                        🥈
                      </span>
                    ) : rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-600/80 text-white font-black text-xs shadow-xs" title="Rank 3: Bronze">
                        🥉
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-medium opacity-60">
                        #{rank}
                      </span>
                    )}
                  </div>

                  <AvatarBadge name={member.name} size="md" />

                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {member.name}
                    </p>
                    <p className="text-[10px] opacity-70 truncate">{member.role}</p>

                    {/* First Call / Last Call timestamps */}
                    <div className="flex items-center space-x-2 mt-1 text-[10px] opacity-60 font-mono">
                      <span>First: {member.firstCallTime}</span>
                      <span>•</span>
                      <span>Last: {member.lastCallTime}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Calls / Duration / Sales Numbers */}
                <div className="text-right shrink-0 pl-3 font-mono space-y-0.5">
                  <div className="text-xs font-bold">
                    {member.calls} calls
                  </div>
                  <div className="text-[11px] opacity-70">{member.durationFormatted}</div>
                  <div className={`text-[11px] font-semibold ${isSelected ? 'text-inherit font-bold' : 'text-[#00695C] dark:text-[#80D5C4]'}`}>
                    {member.salesFormatted}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: Grouped Detail View */}
      <div className="w-full lg:w-[42%] flex flex-col h-full bg-[#F8FAF8] dark:bg-[#111413] overflow-y-auto">
        {/* Header with Export/Download Icon */}
        <div className="p-4 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between bg-[#F8FAF8] dark:bg-[#1D201F]">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-[#6F7976]">
              Metric Drilldown &amp; Deep Stats
            </span>
            <h2 className="text-sm font-semibold text-[#191C1B] dark:text-[#E1E3E0] flex items-center space-x-2 mt-0.5 m3-title-medium">
              <span>{selectedMember ? selectedMember.name : 'Total Team Stats'}</span>
              {selectedMember && (
                <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0]">
                  Rank #{selectedMember.rank}
                </span>
              )}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#ECEFEC] dark:bg-[#272B2A] hover:bg-[#CCE8E1] text-[#191C1B] dark:text-[#E1E3E0] transition-colors"
            title="Export this data as CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          {/* Section 1: Calls */}
          <div className="bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[24px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 pb-2">
              <h3 className="font-semibold text-[#191C1B] dark:text-[#E1E3E0] flex items-center space-x-1.5 m3-title-small">
                <PhoneCall className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                <span>Calls Metrics</span>
              </h3>
              <span className="text-[10px] font-mono text-[#6F7976]">
                Duration: {selectedMember ? selectedMember.durationFormatted : teamStats.totalDurationFormatted}
              </span>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60 border border-transparent">
                <span className="text-[#6F7976] block text-[10px] uppercase">First Call</span>
                <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
                  {selectedMember ? selectedMember.firstCallTime : teamStats.firstCallTime}
                </span>
              </div>
              <div className="p-2.5 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60 border border-transparent">
                <span className="text-[#6F7976] block text-[10px] uppercase">Last Call</span>
                <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
                  {selectedMember ? selectedMember.lastCallTime : teamStats.lastCallTime}
                </span>
              </div>
            </div>

            {/* Calls Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
              {/* All Calls with secondary distinct reps count */}
              <div className="p-3 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60">
                <span className="text-[#6F7976] block text-[10px] uppercase font-medium">All Calls</span>
                <div className="text-sm font-bold text-[#191C1B] dark:text-[#E1E3E0]">
                  {selectedMember
                    ? `${selectedMember.callsDetail.allCalls} (👤1)`
                    : `${teamStats.totalCalls} (👤${teamStats.distinctRepsCount})`}
                </div>
              </div>

              <div className="p-3 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60">
                <span className="text-[#6F7976] block text-[10px] uppercase font-medium">Incoming</span>
                <div className="text-sm font-bold text-sky-700 dark:text-sky-400">
                  {selectedMember ? selectedMember.callsDetail.incoming : teamStats.incomingCalls}
                </div>
              </div>

              <div className="p-3 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60">
                <span className="text-[#6F7976] block text-[10px] uppercase font-medium">Outgoing</span>
                <div className="text-sm font-bold text-indigo-700 dark:text-indigo-400">
                  {selectedMember ? selectedMember.callsDetail.outgoing : teamStats.outgoingCalls}
                </div>
              </div>

              <div className="p-3 rounded-[16px] bg-[#FFDAD6]/40 dark:bg-[#93000A]/20">
                <span className="text-[#BA1A1A] dark:text-[#FFB4AB] block text-[10px] uppercase font-medium">Missed</span>
                <div className="text-sm font-bold text-[#BA1A1A] dark:text-[#FFB4AB]">
                  {selectedMember ? selectedMember.callsDetail.missed : teamStats.missedCalls}
                </div>
              </div>

              {/* Connected Calls (>=60 sec) */}
              <div className="p-3 rounded-[16px] bg-[#CCE8E1]/40 dark:bg-[#004F46]/30 col-span-2 sm:col-span-2">
                <span className="text-[#00201B] dark:text-[#80D5C4] block text-[10px] uppercase font-medium">
                  Connected Calls (≥60 sec)
                </span>
                <div className="text-sm font-bold text-[#00201B] dark:text-[#80D5C4] flex items-center justify-between">
                  <span>
                    {selectedMember
                      ? selectedMember.callsDetail.connected60sPlus
                      : teamStats.connected60sPlus}
                  </span>
                  <span className="text-[10px] font-normal opacity-80">
                    of {selectedMember ? selectedMember.callsDetail.attemptedCalls : teamStats.attemptedCalls} attempted
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Tasks (Late, Pending, Done, Created) */}
          <div className="bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[24px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 p-4 shadow-xs space-y-3">
            <h3 className="font-semibold text-[#191C1B] dark:text-[#E1E3E0] flex items-center space-x-1.5 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 pb-2 m3-title-small">
              <CheckCircle2 className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
              <span>Tasks &amp; Follow-up Fulfillment</span>
            </h3>

            <div className="grid grid-cols-4 gap-2 font-mono text-center">
              {/* Late (red) */}
              <div className="p-2.5 rounded-[16px] bg-[#FFDAD6]/40 dark:bg-[#93000A]/30">
                <span className="text-[10px] uppercase font-medium text-[#BA1A1A] dark:text-[#FFB4AB]">Late</span>
                <div className="text-sm font-bold text-[#BA1A1A] dark:text-[#FFB4AB]">
                  {selectedMember ? selectedMember.tasksDetail.late : teamStats.tasks.late}
                </div>
              </div>

              {/* Pending (amber) */}
              <div className="p-2.5 rounded-[16px] bg-amber-500/10 dark:bg-amber-950/40">
                <span className="text-[10px] uppercase font-medium text-amber-800 dark:text-amber-300">Pending</span>
                <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {selectedMember ? selectedMember.tasksDetail.pending : teamStats.tasks.pending}
                </div>
              </div>

              {/* Done (green) */}
              <div className="p-2.5 rounded-[16px] bg-[#CCE8E1]/50 dark:bg-[#004F46]/40">
                <span className="text-[10px] uppercase font-medium text-[#00201B] dark:text-[#80D5C4]">Done</span>
                <div className="text-sm font-bold text-[#00201B] dark:text-[#80D5C4]">
                  {selectedMember ? selectedMember.tasksDetail.done : teamStats.tasks.done}
                </div>
              </div>

              {/* Created */}
              <div className="p-2.5 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60">
                <span className="text-[10px] uppercase font-medium text-[#6F7976]">Created</span>
                <div className="text-sm font-bold text-[#191C1B] dark:text-[#E1E3E0]">
                  {selectedMember ? selectedMember.tasksDetail.created : teamStats.tasks.created}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: WhatsApp */}
          <div className="bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[24px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 pb-2">
              <h3 className="font-semibold text-[#191C1B] dark:text-[#E1E3E0] flex items-center space-x-1.5 m3-title-small">
                <MessageSquare className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                <span>WhatsApp Cloud API Engagement</span>
              </h3>
              <span className="text-[10px] font-mono text-[#00201B] dark:text-[#80D5C4] font-medium bg-[#CCE8E1] dark:bg-[#004F46] px-2.5 py-0.5 rounded-full">
                Delivery: {selectedMember ? selectedMember.whatsAppDetail.deliveryRate : teamStats.whatsApp.deliveryRate}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono">
              <div className="p-3.5 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60">
                <span className="text-[#6F7976] block text-[10px] uppercase font-medium">Incoming Messages</span>
                <div className="text-base font-bold text-[#191C1B] dark:text-[#E1E3E0]">
                  {selectedMember ? selectedMember.whatsAppDetail.incoming : teamStats.whatsApp.incoming}
                </div>
              </div>

              <div className="p-3.5 rounded-[16px] bg-[#ECEFEC]/60 dark:bg-[#272B2A]/60">
                <span className="text-[#6F7976] block text-[10px] uppercase font-medium">Outgoing Broadcasts</span>
                <div className="text-base font-bold text-[#00695C] dark:text-[#80D5C4]">
                  {selectedMember ? selectedMember.whatsAppDetail.outgoing : teamStats.whatsApp.outgoing}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
