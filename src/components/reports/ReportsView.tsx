import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PhoneCall,
  Users,
  PieChart,
  Calendar,
  Lock,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  Layers,
  Award,
  Clock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ReportStats } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const ReportsView: React.FC = () => {
  const { currentUser, updateCurrentRole } = useAuth();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLeaderOrAdmin = ['tl', 'tl_head', 'it', 'owner', 'cto'].includes(currentUser?.role || '');

  useEffect(() => {
    if (!isLeaderOrAdmin) return;
    setIsLoading(true);
    api.getReports()
      .then(data => setStats(data))
      .catch(e => console.error('Error fetching reports:', e))
      .finally(() => setIsLoading(false));
  }, [isLeaderOrAdmin]);

  // Role Gate Restriction
  if (!isLeaderOrAdmin) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-xl mx-auto my-12">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-300 dark:border-amber-800">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
          Executive Reports Restricted
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
          Access to team telecalling analytics, per-rep conversion rates, and company performance reports
          is reserved for <strong>Team Leads</strong>, <strong>TL Heads</strong>, <strong>IT Admins</strong>, and <strong>Executive</strong> roles.
        </p>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 mb-6">
          <p className="font-semibold mb-2">Want to evaluate the Reports module?</p>
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => updateCurrentRole('tl')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1F3A5F] text-white hover:bg-[#162A45]"
            >
              Switch to Team Lead
            </button>
            <button
              onClick={() => updateCurrentRole('owner')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2E6E5C] text-white hover:bg-[#235b4c]"
            >
              Switch to Owner
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Computing real-time telecalling metrics and team charts...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#1F3A5F] text-white flex items-center justify-center font-bold">
              <BarChart3 className="w-4 h-4 text-teal-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Sales & Telecalling Analytics Dashboard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time conversion metrics computed from stored leads, calls, and WhatsApp interactions
              </p>
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center space-x-1.5">
          <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span>Role View: {currentUser?.role}</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Leads */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Leads</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{stats.totalLeads}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Active pipeline prospects
          </div>
        </div>

        {/* KPI 2: Calls Made Today */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Calls Made Today</span>
            <PhoneCall className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-700 dark:text-sky-300">{stats.callsMadeToday}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Across field & inside reps
          </div>
        </div>

        {/* KPI 3: Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.conversionRate}%</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {stats.leadsWon} Won / {stats.totalLeads} Total
          </div>
        </div>

        {/* KPI 4: Deals Closed */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-semibold uppercase tracking-wider">Won Deals</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300">{stats.leadsWon}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {stats.leadsLost} dropped
          </div>
        </div>
      </div>

      {/* Charts Section: Bar Chart & Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Bar Chart of Calls per Rep */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Calls Made per Telecalling Rep
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Comparison of outbound calls and converted deals per sales executive
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Live Data
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.callsPerRep} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="repName" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F3A5F',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="totalCalls" name="Total Calls" fill="#1F3A5F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="convertedCalls" name="Converted Deals" fill="#2E6E5C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Line Chart of Leads by Stage Over Time */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Pipeline Growth Over Time (Last 7 Days)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Daily volume of new leads entering stages
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Daily Trend
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.leadsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F3A5F',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="Total" stroke="#1F3A5F" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Won" stroke="#2E6E5C" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Contacted" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Hourly Call Activity & Peak Calling Hours */}
      {stats.hourlyCallActivity && stats.hourlyCallActivity.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#1F3A5F] dark:text-teal-400" />
                <span>Peak Telecalling Windows & Hourly Activity</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Call volume, customer pickups, and follow-ups distribution across the business day
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Peak Window: 11:00 AM - 1:00 PM & 4:00 PM - 6:00 PM
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourlyCallActivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="hourLabel" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F3A5F',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="calls" name="Calls Dialed" fill="#1F3A5F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="followUps" name="Follow-Ups Scheduled" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="conversions" name="Deals Converted" fill="#2E6E5C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rep Telecalling Performance Leaderboard */}
      {stats.repLeaderboard && stats.repLeaderboard.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Sales Rep Leaderboard & Talk-Time Metrics</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Track calling velocity, conversion ratio, and total customer connect duration
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Live Team Ranking
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Sales Representative</th>
                  <th className="py-3 px-4 text-right">Calls Made</th>
                  <th className="py-3 px-4 text-right">Talk Time</th>
                  <th className="py-3 px-4 text-right">Deals Won</th>
                  <th className="py-3 px-4 text-right">Conversion Rate</th>
                  <th className="py-3 px-4 w-40">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.repLeaderboard.map((item, idx) => {
                  const rankMedals = ['🥇', '🥈', '🥉'];
                  return (
                    <tr key={item.repId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-bold">
                        {idx < 3 ? (
                          <span className="text-base" title={`Rank ${idx + 1}`}>{rankMedals[idx]}</span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">#{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-[#1F3A5F] text-white flex items-center justify-center font-bold text-xs">
                            {item.repName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100">{item.repName}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {item.calls}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {item.talkTimeMin} mins
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#2E6E5C] dark:text-teal-400">
                        {item.conversions}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.conversionRate}%
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#2E6E5C] h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, item.conversionRate * 3.5)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leads by Source Breakdown Table & Progress Bars */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
          Channel Acquisition Breakdown (Leads by Source)
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
          Contribution of IndiaMART, WhatsApp Inbound, Website Form, Google Ads, and Facebook
        </p>

        <div className="space-y-3">
          {stats.leadsBySource.map((s) => (
            <div key={s.source} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">{s.source}</span>
                <span className="text-slate-500 font-mono">
                  {s.count} leads ({s.percentage}%)
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2E6E5C] rounded-full transition-all duration-500"
                  style={{ width: `${s.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
