import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  PhoneCall,
  MessageSquare,
  Clock,
  Filter,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Plus,
  BarChart2
} from 'lucide-react';
import {
  MOCK_ACTIVITY_PERFORMANCE,
  MOCK_FOLLOW_UPS,
  MOCK_SAVED_FILTERS,
  PIPELINE_STAGES,
  SavedFilterItem,
  MockLead
} from '../../data/mockSeedData';
import { Call } from '../../types';
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
  leads: MockLead[];
  calls?: Call[];
  onNavigateToLeadsFilter?: (filterName: string) => void;
  onNavigateToStage?: (stage: string) => void;
  onNavigateToCalls?: () => void;
  onOpenAddLead?: () => void;
  onSelectLead?: (lead: MockLead) => void;
  onStartCall?: (lead: MockLead) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads = [],
  calls = [],
  onNavigateToLeadsFilter,
  onNavigateToStage,
  onNavigateToCalls,
  onOpenAddLead,
  onSelectLead,
  onStartCall
}) => {
  // Time Range States
  const [activityRange, setActivityRange] = useState<DashboardTimeRange>('This month');
  const [activitySearch, setActivitySearch] = useState('');
  const [followUpSearch, setFollowUpSearch] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  // 1. Calculate Real Lead & Pipeline Metrics
  const pipelineMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const totalPipelineValue = leads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const wonLeads = leads.filter((l) => (l.stage || l.status) === 'Won');
    const wonRevenue = wonLeads.reduce((acc, l) => acc + (Number(l.value) || 0), 0);
    const activeLeads = leads.filter(
      (l) => !['Won', 'Lost'].includes(l.stage || l.status)
    );

    // Format Indian Rupees currency
    const formatCurrency = (amount: number) => {
      if (amount >= 10000000) {
        return `₹ ${(amount / 10000000).toFixed(2)} Cr`;
      }
      if (amount >= 100000) {
        return `₹ ${(amount / 100000).toFixed(1)} L`;
      }
      return `₹ ${amount.toLocaleString('en-IN')}`;
    };

    return {
      totalLeads,
      totalPipelineValueFormatted: formatCurrency(totalPipelineValue),
      wonCount: wonLeads.length,
      wonRevenueFormatted: formatCurrency(wonRevenue),
      activeCount: activeLeads.length
    };
  }, [leads]);

  // 2. Stage Breakdown from Real Leads
  const stageDistribution = useMemo(() => {
    const counts: Record<string, { count: number; value: number }> = {};
    PIPELINE_STAGES.forEach((st) => {
      counts[st] = { count: 0, value: 0 };
    });

    leads.forEach((l) => {
      const stage = l.stage || l.status || 'Fresh Lead';
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

  // 3. Activity Performance Data (Scaled by Timeframe)
  const activityMultiplier = useMemo(() => {
    switch (activityRange) {
      case 'Today':
        return 0.2;
      case 'Yesterday':
        return 0.18;
      case 'This week':
        return 0.45;
      case 'This quarter':
        return 2.8;
      default:
        return 1.0;
    }
  }, [activityRange]);

  const activityRows = useMemo(() => {
    return MOCK_ACTIVITY_PERFORMANCE.filter((r) =>
      (r.assignee || '').toLowerCase().includes(activitySearch.toLowerCase())
    ).map((r) => {
      const scaledCalls = Math.round(r.calls * activityMultiplier);
      const scaledMins = Math.round(r.durationMinutes * activityMultiplier);
      const hours = Math.floor(scaledMins / 60);
      const remMins = scaledMins % 60;
      const rev = Math.round(r.revenue * activityMultiplier);
      const revFormatted =
        rev >= 100000 ? `₹ ${(rev / 100000).toFixed(1)} L` : `₹ ${rev.toLocaleString('en-IN')}`;

      return {
        ...r,
        calls: scaledCalls,
        durationFormatted: `${hours}h ${remMins.toString().padStart(2, '0')}m`,
        revenue: rev,
        revenueFormatted: revFormatted
      };
    });
  }, [activitySearch, activityMultiplier]);

  const activityTotals = useMemo(() => {
    const totalCalls = activityRows.reduce((acc, r) => acc + r.calls, 0);
    const totalRevenue = activityRows.reduce((acc, r) => acc + r.revenue, 0);
    return {
      calls: totalCalls,
      revenueFormatted:
        totalRevenue >= 100000
          ? `₹ ${(totalRevenue / 100000).toFixed(1)} L`
          : `₹ ${totalRevenue.toLocaleString('en-IN')}`
    };
  }, [activityRows]);

  // 4. Follow Ups / Callbacks Workload
  const followUpRows = useMemo(() => {
    return MOCK_FOLLOW_UPS.filter((r) =>
      (r.assignee || '').toLowerCase().includes(followUpSearch.toLowerCase())
    );
  }, [followUpSearch]);

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

  // 5. Actionable High-Priority Follow-ups
  const highPriorityLeads = useMemo(() => {
    return leads
      .filter((l) => l.rating >= 4 && !['Won', 'Lost'].includes(l.stage || l.status))
      .slice(0, 4);
  }, [leads]);

  // 6. Recent Chronological Customer Activity from Real Leads
  const recentEvents = useMemo(() => {
    const events: {
      id: string;
      leadName: string;
      action: string;
      actor: string;
      timeAgo: string;
      badgeTone: 'primary' | 'success' | 'warning' | 'info' | 'neutral';
    }[] = [];

    // Leads recently created or updated
    leads.slice(0, 6).forEach((lead, idx) => {
      events.push({
        id: `ev-${lead.id}-${idx}`,
        leadName: lead.name,
        action: `Stage: ${lead.stage || lead.status} · ${lead.companyOrProject || 'Inquiry'}`,
        actor: lead.assignee || 'Aakash Verma',
        timeAgo: lead.createdOn || 'Today',
        badgeTone:
          (lead.stage || lead.status) === 'Won'
            ? 'success'
            : (lead.stage || lead.status) === 'Fresh Lead'
            ? 'primary'
            : 'neutral'
      });
    });

    return events;
  }, [leads]);

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
            status="Live Engine Active"
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

      {/* Main Dashboard Canvas */}
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
            value={activityTotals.calls}
            subtext={`${activityTotals.revenueFormatted} revenue driven`}
            icon={<PhoneCall className="w-5 h-5" />}
            onClick={onNavigateToCalls}
          />

          <StatCard
            label="WhatsApp Cloud"
            value="WACA Active"
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

        {/* 3. Actionable Attention Banner (If Late Follow-ups Exist) */}
        {followUpTotals.late > 0 && (
          <div className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-body">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-heading text-amber-950 dark:text-amber-200">
                  {followUpTotals.late} Overdue Callbacks Require Action
                </h2>
                <p className="text-xs text-amber-800 dark:text-amber-400">
                  Callbacks exceeded scheduled SLA window. Please contact customer or reassign.
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

                  {/* Operational M3 Progress Track */}
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
                <CardDescription>Calls, duration and revenue generated per rep</CardDescription>
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
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] dark:border-[#334155] text-[#475569] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-2.5 px-2">Assignee</th>
                    <th className="pb-2.5 px-2 text-right">Calls</th>
                    <th className="pb-2.5 px-2 text-right">Talk Duration</th>
                    <th className="pb-2.5 px-2 text-right">Revenue</th>
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

        {/* 6. Recent Activity & Priority Leads Stream */}
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
                  description="Activity will appear here as leads and communication events occur."
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

          {/* High Priority Uncontacted Leads (5 Cols) */}
          <Card elevation="surface" className="lg:col-span-5 flex flex-col">
            <CardHeader>
              <div>
                <CardTitle>High Priority Leads</CardTitle>
                <CardDescription>Rated 4-5 stars needing active engagement</CardDescription>
              </div>
              <Badge tone="primary" size="sm">
                Priority
              </Badge>
            </CardHeader>

            <CardContent className="space-y-3 pt-1">
              {highPriorityLeads.length === 0 ? (
                <EmptyState
                  title="All High Priority Leads Addressed"
                  description="No pending 4-star or 5-star leads requiring immediate outreach."
                />
              ) : (
                highPriorityLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#111514] border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                        {lead.name}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                        {lead.companyOrProject || 'Real Estate Lead'} · {lead.phone}
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
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
