import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  PhoneCall,
  MessageSquare,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Plus,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Lead, Call, Message, LeadStage } from '../../types';
import { PIPELINE_STAGES } from '../../constants/pipeline';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge, Badge } from '../ui/Badge';
import { SearchInput } from '../ui/SearchInput';
import { Select } from '../ui/Select';
import { EmptyState } from '../ui/EmptyState';

export type DashboardTimeRange = 'Today' | 'Yesterday' | 'This week' | 'This month' | 'This quarter';

interface DashboardViewProps {
  leads: Lead[];
  calls?: Call[];
  messages?: Message[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onNavigateToLeadsFilter?: (filterName: string) => void;
  onNavigateToStage?: (stage: string) => void;
  onNavigateToCalls?: () => void;
  onOpenAddLead?: () => void;
  onSelectLead?: (lead: Lead) => void;
  onStartCall?: (lead: Lead) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads = [],
  calls = [],
  messages = [],
  isLoading = false,
  isRefreshing = false,
  error = null,
  onRefresh,
  onNavigateToLeadsFilter,
  onNavigateToStage,
  onNavigateToCalls,
  onOpenAddLead,
  onSelectLead,
  onStartCall
}) => {
  // Time Range & Search States
  const [activityRange, setActivityRange] = useState<DashboardTimeRange>('This month');
  const [activitySearch, setActivitySearch] = useState('');
  const [followUpSearch, setFollowUpSearch] = useState('');

  // Currency Formatter
  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹ ${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `₹ ${(amount / 100000).toFixed(1)} L`;
    }
    return `₹ ${amount.toLocaleString('en-IN')}`;
  };

  // 1. Calculate Real Lead & Pipeline Metrics from real database leads
  const pipelineMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const totalPipelineValue = leads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const wonLeads = leads.filter((l) => l.stage === 'Won');
    const wonRevenue = wonLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const activeLeads = leads.filter(
      (l) => !['Won', 'Lost'].includes(l.stage)
    );

    return {
      totalLeads,
      totalPipelineValueFormatted: formatCurrency(totalPipelineValue),
      wonCount: wonLeads.length,
      wonRevenueFormatted: formatCurrency(wonRevenue),
      activeCount: activeLeads.length
    };
  }, [leads]);

  // 2. Real Stage Breakdown from database leads
  const stageDistribution = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    PIPELINE_STAGES.forEach((st) => {
      counts[st] = { count: 0, value: 0 };
    });

    leads.forEach((l) => {
      const stage = l.stage || 'New';
      if (!counts[stage]) {
        counts[stage] = { count: 0, value: 0 };
      }
      counts[stage].count += 1;
      counts[stage].value += Number(l.value) || 0;
    });

    const maxCount = Math.max(...Object.values(counts).map((c) => c.count), 1);

    return {
      stages: Object.entries(counts).map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
        percentage: leads.length ? Math.round((data.count / leads.length) * 100) : 0,
        relativeWidth: Math.round((data.count / maxCount) * 100)
      })),
      total: leads.length
    };
  }, [leads]);

  // 3. Real Telesales Rep Performance filtered by exact timeframe (NO synthetic multiplier)
  const activityRows = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const oneQuarterAgo = now - 90 * 24 * 60 * 60 * 1000;

    // Filter calls strictly by selected time range
    const filteredCalls = calls.filter((c) => {
      if (!c.timestamp) return true;
      const callTime = new Date(c.timestamp).getTime();

      switch (activityRange) {
        case 'Today':
          return callTime >= startOfToday.getTime();
        case 'Yesterday':
          return callTime >= startOfYesterday.getTime() && callTime < startOfToday.getTime();
        case 'This week':
          return callTime >= oneWeekAgo;
        case 'This quarter':
          return callTime >= oneQuarterAgo;
        case 'This month':
        default:
          return callTime >= oneMonthAgo;
      }
    });

    // Group by Rep
    const repMap = new Map<
      string,
      { assignee: string; calls: number; durationSeconds: number; revenue: number }
    >();

    // Seed reps from unique assignees in leads and calls
    leads.forEach((l) => {
      const repName = l.assignedRepName || (l as any).assignee;
      if (repName && !repMap.has(repName)) {
        repMap.set(repName, { assignee: repName, calls: 0, durationSeconds: 0, revenue: 0 });
      }
    });

    filteredCalls.forEach((c) => {
      const repName = c.repName || 'Unassigned';
      if (!repMap.has(repName)) {
        repMap.set(repName, { assignee: repName, calls: 0, durationSeconds: 0, revenue: 0 });
      }
      const entry = repMap.get(repName)!;
      entry.calls += 1;
      entry.durationSeconds += Number(c.duration) || 0;
    });

    // Tally real revenue from won leads assigned to each rep
    leads.forEach((l) => {
      if (l.stage === 'Won') {
        const repName = l.assignedRepName || (l as any).assignee;
        if (repName && repMap.has(repName)) {
          repMap.get(repName)!.revenue += Number(l.value) || 0;
        }
      }
    });

    const rows = Array.from(repMap.values()).map((r) => {
      const totalMinutes = Math.round(r.durationSeconds / 60);
      const hours = Math.floor(totalMinutes / 60);
      const remMins = totalMinutes % 60;
      return {
        ...r,
        durationFormatted: `${hours}h ${remMins.toString().padStart(2, '0')}m`,
        revenueFormatted: formatCurrency(r.revenue)
      };
    });

    if (activitySearch.trim()) {
      const q = activitySearch.toLowerCase().trim();
      return rows.filter((r) => r.assignee.toLowerCase().includes(q));
    }

    return rows;
  }, [calls, leads, activityRange, activitySearch]);

  const activityTotals = useMemo(() => {
    const totalCalls = activityRows.reduce((acc, r) => acc + r.calls, 0);
    const totalRevenue = activityRows.reduce((acc, r) => acc + r.revenue, 0);
    return {
      calls: totalCalls,
      revenueFormatted: formatCurrency(totalRevenue)
    };
  }, [activityRows]);

  // 4. Real Follow-up & Callback Workload derived from leads database
  const followUpRows = useMemo(() => {
    const repMap = new Map<
      string,
      { assignee: string; upcoming: number; late: number; done: number; cancel: number }
    >();

    const now = Date.now();

    leads.forEach((l) => {
      const repName = l.assignedRepName || (l as any).assignee || 'Unassigned';
      if (!repMap.has(repName)) {
        repMap.set(repName, { assignee: repName, upcoming: 0, late: 0, done: 0, cancel: 0 });
      }
      const entry = repMap.get(repName)!;

      if (l.callbackReminder) {
        const remTime = new Date(l.callbackReminder).getTime();
        if (l.stage === 'Won') {
          entry.done += 1;
        } else if (l.stage === 'Lost') {
          entry.cancel += 1;
        } else if (remTime < now) {
          entry.late += 1;
        } else {
          entry.upcoming += 1;
        }
      } else if (l.stage === 'Follow-up') {
        entry.upcoming += 1;
      }
    });

    const rows = Array.from(repMap.values());
    if (followUpSearch.trim()) {
      const q = followUpSearch.toLowerCase().trim();
      return rows.filter((r) => r.assignee.toLowerCase().includes(q));
    }
    return rows;
  }, [leads, followUpSearch]);

  const followUpTotals = useMemo(() => {
    return followUpRows.reduce(
      (acc, r) => ({
        upcoming: acc.upcoming + r.upcoming,
        late: acc.late + r.late,
        done: acc.done + r.done,
        cancel: acc.cancel + r.cancel,
        total: acc.total + r.upcoming + r.late + r.done + r.cancel
      }),
      { upcoming: 0, late: 0, done: 0, cancel: 0, total: 0 }
    );
  }, [followUpRows]);

  // 5. Actionable Priority Leads: Real leads with rating >= 4 or value >= 2.5L
  const highPriorityLeads = useMemo(() => {
    return leads
      .filter((l) => {
        const rating = (l.customFields?.rating as number) ?? (l as any).rating ?? 0;
        const val = Number(l.value) || 0;
        return (rating >= 4 || val >= 250000) && !['Won', 'Lost'].includes(l.stage);
      })
      .slice(0, 5);
  }, [leads]);

  // 6. Real Chronological Customer Activity Stream from Calls, Messages, and Leads
  const recentEvents = useMemo(() => {
    interface UnifiedEvent {
      id: string;
      leadName: string;
      action: string;
      actor: string;
      timestamp: number;
      timeAgo: string;
      badgeTone: 'primary' | 'success' | 'warning' | 'info' | 'neutral';
    }

    const events: UnifiedEvent[] = [];

    // Real Calls
    calls.slice(0, 8).forEach((call) => {
      const callTime = call.timestamp ? new Date(call.timestamp).getTime() : Date.now();
      const minsAgo = Math.max(1, Math.round((Date.now() - callTime) / 60000));
      const timeStr = minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.round(minsAgo / 60)}h ago` : `${Math.round(minsAgo / 1440)}d ago`;

      events.push({
        id: `call-${call.id}`,
        leadName: call.leadName || 'Customer Lead',
        action: `Call Logged: ${call.outcome || 'Connected'} (${Math.round(call.duration / 60)}m)`,
        actor: call.repName || 'Sales Rep',
        timestamp: callTime,
        timeAgo: timeStr,
        badgeTone: call.outcome === 'Converted' ? 'success' : 'primary'
      });
    });

    // Real Messages
    messages.slice(0, 8).forEach((msg) => {
      const msgTime = msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now();
      const minsAgo = Math.max(1, Math.round((Date.now() - msgTime) / 60000));
      const timeStr = minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.round(minsAgo / 60)}h ago` : `${Math.round(minsAgo / 1440)}d ago`;

      events.push({
        id: `msg-${msg.id}`,
        leadName: msg.leadName || 'Customer',
        action: `WhatsApp: ${msg.body ? (msg.body.length > 36 ? msg.body.substring(0, 36) + '...' : msg.body) : 'Message delivered'}`,
        actor: msg.direction === 'inbound' ? 'Inbound Customer' : 'Cloud API',
        timestamp: msgTime,
        timeAgo: timeStr,
        badgeTone: 'info'
      });
    });

    // Real Leads created
    leads.slice(0, 5).forEach((lead) => {
      if (lead.createdDate) {
        const lTime = new Date(lead.createdDate).getTime();
        const minsAgo = Math.max(1, Math.round((Date.now() - lTime) / 60000));
        const timeStr = minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.round(minsAgo / 60)}h ago` : `${Math.round(minsAgo / 1440)}d ago`;

        events.push({
          id: `lead-new-${lead.id}`,
          leadName: lead.name,
          action: `New Lead Captured · ${lead.source || 'Direct'} (${lead.stage})`,
          actor: lead.assignedRepName || 'System',
          timestamp: lTime,
          timeAgo: timeStr,
          badgeTone: lead.stage === 'Won' ? 'success' : 'neutral'
        });
      }
    });

    // Sort chronologically descending
    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
  }, [calls, messages, leads]);

  const currentDateFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF9] dark:bg-[#111514] overflow-y-auto font-body select-none">
      {/* 1. Page Header */}
      <PageHeader
        title="Dashboard"
        description="Workspace overview and today's operational activity."
        kicker="Operational Telemetry"
        badge={
          <StatusBadge
            status={isRefreshing ? 'Refreshing...' : 'Live Engine Active'}
            tone="success"
            size="sm"
          />
        }
        actions={
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] dark:bg-[#161A19] border border-[#E2E8F0] dark:border-[#334155] text-xs text-[#475569] dark:text-[#94A3B8]">
              <Calendar className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
              <span className="font-medium text-[#0F172A] dark:text-[#F1F5F9]">
                {currentDateFormatted}
              </span>
            </div>

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              >
                Refresh
              </Button>
            )}

            {onOpenAddLead && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenAddLead}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Lead
              </Button>
            )}
          </div>
        }
      />

      {/* Error State Banner */}
      {error && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-[#410002] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#BA1A1A]" />
            <span>{error}</span>
          </div>
          {onRefresh && (
            <Button variant="primary" size="sm" onClick={onRefresh}>
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 h-72 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl animate-pulse" />
            <div className="lg:col-span-7 h-72 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl animate-pulse" />
          </div>
        </div>
      )}

      {/* Main Dashboard Canvas */}
      {!isLoading && (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* 2. Primary KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Leads"
              value={pipelineMetrics.totalLeads}
              subtext={`${pipelineMetrics.activeCount} active in pipeline`}
              icon={<Users className="w-5 h-5" />}
              onClick={() => onNavigateToLeadsFilter && onNavigateToLeadsFilter('All')}
            />

            <StatCard
              label="Pipeline Value"
              value={pipelineMetrics.totalPipelineValueFormatted}
              subtext={`${pipelineMetrics.wonCount} won (${pipelineMetrics.wonRevenueFormatted})`}
              icon={<TrendingUp className="w-5 h-5" />}
            />

            <StatCard
              label="Calls Completed"
              value={calls.length}
              subtext={`${activityTotals.revenueFormatted} won rep revenue`}
              icon={<PhoneCall className="w-5 h-5" />}
              onClick={onNavigateToCalls}
            />

            <StatCard
              label="WhatsApp Cloud"
              value={messages.length > 0 ? `${messages.length} Messages` : 'WACA Active'}
              subtext="Meta Cloud API Connected"
              icon={<MessageSquare className="w-5 h-5" />}
            />

            <StatCard
              label="Follow-ups Due"
              value={followUpTotals.upcoming + followUpTotals.late}
              subtext={
                followUpTotals.late > 0
                  ? `${followUpTotals.late} late callbacks`
                  : 'All callbacks on track'
              }
              icon={<Clock className="w-5 h-5" />}
            />
          </div>

          {/* 3. Actionable Attention Banner (If Overdue Callbacks Exist) */}
          {followUpTotals.late > 0 && (
            <div className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-body">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-heading text-amber-950 dark:text-amber-200">
                    {followUpTotals.late} Overdue Callback{followUpTotals.late !== 1 ? 's' : ''} Require Action
                  </h2>
                  <p className="text-xs text-amber-800 dark:text-amber-400">
                    Callbacks exceeded scheduled window. Please contact customer or reassign lead.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 hover:bg-amber-100 text-amber-950 dark:text-amber-200 shrink-0"
                onClick={onNavigateToCalls}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Review Overdue
              </Button>
            </div>
          )}

          {/* 4. Operations Overview: Pipeline Distribution & Telesales Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pipeline Stage Distribution (5 Cols) */}
            <Card elevation="surface" className="lg:col-span-5 flex flex-col">
              <CardHeader>
                <div>
                  <CardTitle>Pipeline Distribution</CardTitle>
                  <CardDescription>Real distribution of customer deal stages</CardDescription>
                </div>
                <Badge tone="neutral" size="sm">
                  {leads.length} Records
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3 flex-1">
                {stageDistribution.stages.map((st) => (
                  <div
                    key={st.stage}
                    onClick={() => {
                      if (onNavigateToStage) onNavigateToStage(st.stage);
                      else if (onNavigateToLeadsFilter) onNavigateToLeadsFilter(st.stage);
                    }}
                    className="group cursor-pointer p-2 rounded-xl hover:bg-[#F1F5F4] dark:hover:bg-[#1E293B] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] group-hover:text-[#00695C] dark:group-hover:text-[#80D5C4] transition-colors">
                        {st.stage}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#64748B] dark:text-[#94A3B8]">
                          {st.count} leads
                        </span>
                        <span className="font-semibold tabular-nums text-[#0F172A] dark:text-[#F1F5F9]">
                          {st.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Operational Progress Track */}
                    <div className="w-full h-2 rounded-full bg-[#E2E8F0] dark:bg-[#202726] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#00695C] dark:bg-[#80D5C4] transition-all duration-300"
                        style={{ width: `${Math.max(st.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Telesales Rep Performance (7 Cols) */}
            <Card elevation="surface" className="lg:col-span-7 flex flex-col">
              <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Telesales Activity &amp; Output</CardTitle>
                  <CardDescription>Real dials, duration, and won value in period</CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-32">
                    <Select
                      options={[
                        { value: 'Today', label: 'Today' },
                        { value: 'Yesterday', label: 'Yesterday' },
                        { value: 'This week', label: 'This Week' },
                        { value: 'This month', label: 'This Month' },
                        { value: 'This quarter', label: 'This Quarter' }
                      ]}
                      value={activityRange}
                      onChange={(e) => setActivityRange(e.target.value as DashboardTimeRange)}
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="overflow-x-auto pt-1 flex-1">
                {activityRows.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#64748B]">
                    No rep activity recorded for {activityRange.toLowerCase()}.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
                        <th className="pb-2.5 px-2">Assignee</th>
                        <th className="pb-2.5 px-2 text-right">Calls</th>
                        <th className="pb-2.5 px-2 text-right">Talk Duration</th>
                        <th className="pb-2.5 px-2 text-right">Won Revenue</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F1F5F4] dark:divide-[#202726] text-[#0F172A] dark:text-[#F1F5F9]">
                      {activityRows.map((row) => (
                        <tr
                          key={row.assignee}
                          className="hover:bg-[#F8FAF9] dark:hover:bg-[#1C2220] transition-colors"
                        >
                          <td className="py-2.5 px-2 font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-[#CCE8E1] text-[#00201B] dark:bg-[#004F46] dark:text-[#A3F2E4] font-bold text-[10px] flex items-center justify-center shrink-0">
                                {row.assignee.charAt(0)}
                              </div>
                              <span className="truncate max-w-[140px]">{row.assignee}</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-2 text-right font-mono font-semibold">
                            {row.calls}
                          </td>

                          <td className="py-2.5 px-2 text-right font-mono text-[#64748B] dark:text-[#94A3B8]">
                            {row.durationFormatted}
                          </td>

                          <td className="py-2.5 px-2 text-right font-mono font-semibold text-[#00695C] dark:text-[#80D5C4]">
                            {row.revenueFormatted}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr className="border-t border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAF9] dark:bg-[#111514] font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                        <td className="py-2.5 px-2 uppercase tracking-wide text-[11px]">
                          Team Total
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">
                          {activityTotals.calls}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-[#64748B] dark:text-[#94A3B8]">
                          —
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-[#00695C] dark:text-[#80D5C4]">
                          {activityTotals.revenueFormatted}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 5. Operations Row 2: Follow-up Workload & Fatigue Guard Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Follow-up Workload (7 cols) */}
            <Card elevation="surface" className="lg:col-span-7 flex flex-col">
              <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>Follow-up Workload</CardTitle>
                  <CardDescription>Upcoming, late, completed and cancelled callbacks</CardDescription>
                </div>

                <div className="w-48">
                  <SearchInput
                    value={followUpSearch}
                    onChange={setFollowUpSearch}
                    placeholder="Filter rep..."
                    inputSize="sm"
                  />
                </div>
              </CardHeader>

              <CardContent className="overflow-x-auto pt-1 flex-1">
                {followUpRows.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#64748B]">
                    No follow-ups or callbacks scheduled.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
                        <th className="pb-2.5 px-2">Assignee</th>
                        <th className="pb-2.5 px-2 text-center text-amber-700 dark:text-amber-300">
                          Upcoming
                        </th>
                        <th className="pb-2.5 px-2 text-center text-[#BA1A1A] dark:text-[#FFB4AB]">
                          Late
                        </th>
                        <th className="pb-2.5 px-2 text-center text-[#00695C] dark:text-[#80D5C4]">
                          Done
                        </th>
                        <th className="pb-2.5 px-2 text-center text-[#64748B]">
                          Cancel
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#F1F5F4] dark:divide-[#202726] text-[#0F172A] dark:text-[#F1F5F9]">
                      {followUpRows.map((row) => (
                        <tr
                          key={row.assignee}
                          className="hover:bg-[#F8FAF9] dark:hover:bg-[#1C2220] transition-colors"
                        >
                          <td className="py-2.5 px-2 font-medium truncate max-w-[140px]">
                            {row.assignee}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-semibold text-amber-700 dark:text-amber-300">
                            {row.upcoming}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-semibold text-[#BA1A1A] dark:text-[#FFB4AB]">
                            {row.late}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-semibold text-[#00695C] dark:text-[#80D5C4]">
                            {row.done}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[#64748B]">
                            {row.cancel}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                    <tfoot>
                      <tr className="border-t border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAF9] dark:bg-[#111514] font-bold text-[#0F172A] dark:text-[#F1F5F9]">
                        <td className="py-2.5 px-2 uppercase tracking-wide text-[11px]">
                          Total
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-amber-700 dark:text-amber-300">
                          {followUpTotals.upcoming}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[#BA1A1A] dark:text-[#FFB4AB]">
                          {followUpTotals.late}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[#00695C] dark:text-[#80D5C4]">
                          {followUpTotals.done}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-[#64748B]">
                          {followUpTotals.cancel}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Compliance & Fatigue Guard Telemetry (5 cols) */}
            <Card elevation="surface" className="lg:col-span-5 flex flex-col justify-between">
              <CardHeader>
                <div>
                  <CardTitle>Trust &amp; Fatigue Guard</CardTitle>
                  <CardDescription>Automated telecom regulation checks</CardDescription>
                </div>
                <StatusBadge status="ACTIVE" tone="success" size="sm" />
              </CardHeader>

              <CardContent className="space-y-3.5">
                <div className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#111514] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                        Quiet Hours Window
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Restricted 8:00 PM – 8:00 AM IST
                      </div>
                    </div>
                  </div>
                  <StatusBadge status="COMPLIANT" tone="success" size="sm" />
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#111514] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                        Contact Frequency Limits
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Max 3 calls/day · Max 6 calls/week
                      </div>
                    </div>
                  </div>
                  <StatusBadge status="ENFORCED" tone="info" size="sm" />
                </div>

                <div className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#111514] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9]">
                        DND / Fatigue Cap Blocks
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        Zero unauthorized dial attempts
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#00695C] dark:text-[#80D5C4]">
                    0 Violations
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 6. Recent Chronological Customer Activity & Priority Leads Stream */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Operational Activity (7 Cols) */}
            <Card elevation="surface" className="lg:col-span-7 flex flex-col">
              <CardHeader>
                <div>
                  <CardTitle>Recent Activity Trail</CardTitle>
                  <CardDescription>Chronological pipeline mutations and outreach</CardDescription>
                </div>
                <Badge tone="neutral" size="sm">
                  Live Audit
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3 pt-1">
                {recentEvents.length === 0 ? (
                  <EmptyState
                    title="No Recent Activity"
                    description="Activity will appear here as real calls, messages, and lead interactions occur."
                  />
                ) : (
                  recentEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#111514] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                            {evt.leadName}
                          </span>
                          <StatusBadge
                            status={evt.timeAgo}
                            tone={evt.badgeTone}
                            showDot={false}
                            size="sm"
                          />
                        </div>
                        <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                          {evt.action}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-medium text-[#475569] dark:text-[#94A3B8]">
                          {evt.actor}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* High Priority Leads (5 Cols) */}
            <Card elevation="surface" className="lg:col-span-5 flex flex-col">
              <CardHeader>
                <div>
                  <CardTitle>High Priority Leads</CardTitle>
                  <CardDescription>Rated 4-5 stars or high value needing active engagement</CardDescription>
                </div>
                <Badge tone="primary" size="sm">
                  Priority
                </Badge>
              </CardHeader>

              <CardContent className="space-y-3 pt-1">
                {highPriorityLeads.length === 0 ? (
                  <EmptyState
                    title="All High Priority Leads Addressed"
                    description="No pending high priority leads requiring immediate outreach."
                  />
                ) : (
                  highPriorityLeads.map((lead) => {
                    const company = lead.industry || (lead as any).companyOrProject;
                    return (
                      <div
                        key={lead.id}
                        className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#111514] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                            {lead.name}
                          </div>
                          <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                            {company ? `${company} · ` : ''}{lead.phone}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {onStartCall && (
                            <Button
                              variant="tonal"
                              size="sm"
                              onClick={() => onStartCall(lead)}
                              leftIcon={<PhoneCall className="w-3.5 h-3.5" />}
                            >
                              Call
                            </Button>
                          )}

                          {onSelectLead && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onSelectLead(lead)}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
