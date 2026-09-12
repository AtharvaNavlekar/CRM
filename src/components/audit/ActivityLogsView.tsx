import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserCheck,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Activity,
  Layers,
  Info,
  X
} from 'lucide-react';
import { AuditLog } from '../../types';
import { SkeletonBox } from '../skeletons/M3Skeleton';
import { useAuth } from '../../context/AuthContext';

export const ActivityLogsView: React.FC = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'security' | 'exports' | 'mutations' | 'auth' | 'comms'>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'denied' | 'approval_gated' | 'standard'>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const fetchLogs = async (showRefreshSpinner = false) => {
    if (showRefreshSpinner) setIsRefreshing(true);
    setError(null);
    try {
      const token = localStorage.getItem('dialpulse_token');
      const response = await fetch('/api/audit-logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) {
        throw new Error(`Failed to load audit logs: ${response.status}`);
      }

      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Audit logs fetch error:', err);
      setError(err.message || 'Failed to retrieve system activity logs.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filtered logs calculation
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          log.action.toLowerCase().includes(query) ||
          log.details.toLowerCase().includes(query) ||
          log.userName.toLowerCase().includes(query) ||
          log.userRole.toLowerCase().includes(query) ||
          log.ip.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const action = log.action.toUpperCase();
        if (categoryFilter === 'security') {
          if (!action.includes('DENIED') && !action.includes('SECURITY') && !action.includes('POLICY')) return false;
        } else if (categoryFilter === 'exports') {
          if (!action.includes('EXPORT') && !log.requiredApproval) return false;
        } else if (categoryFilter === 'mutations') {
          if (!action.includes('LEAD') && !action.includes('UPDATE') && !action.includes('DELETE') && !action.includes('CREATE')) return false;
        } else if (categoryFilter === 'auth') {
          if (!action.includes('LOGIN') && !action.includes('LOGOUT') && !action.includes('SWITCH') && !action.includes('ROLE')) return false;
        } else if (categoryFilter === 'comms') {
          if (!action.includes('CALL') && !action.includes('WHATSAPP') && !action.includes('MESSAGE')) return false;
        }
      }

      // Role filter
      if (roleFilter !== 'all') {
        if (log.userRole.toLowerCase() !== roleFilter.toLowerCase()) return false;
      }

      // Status / Gating filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'denied') {
          if (!log.action.includes('DENIED')) return false;
        } else if (statusFilter === 'approval_gated') {
          if (!log.requiredApproval && !log.action.includes('EXPORT')) return false;
        } else if (statusFilter === 'standard') {
          if (log.action.includes('DENIED') || log.requiredApproval) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, categoryFilter, roleFilter, statusFilter]);

  // Pagination slicing
  const totalCount = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const denied = logs.filter((l) => l.action.includes('DENIED')).length;
    const approvalGated = logs.filter((l) => l.requiredApproval || l.action.includes('EXPORT')).length;
    const actors = new Set(logs.map((l) => l.userId)).size;
    return { total, denied, approvalGated, actors };
  }, [logs]);

  // Format date to Indian Standard Time readable string
  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return iso;
    }
  };

  // Export current filtered logs to CSV
  const handleExportFilteredLogs = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'Actor Name', 'Role', 'Scope', 'IP Address', 'Approval Required', 'Details'];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.userName}"`,
      `"${l.userRole}"`,
      `"${l.scope || 'N/A'}"`,
      `"${l.ip}"`,
      l.requiredApproval ? 'YES' : 'NO',
      `"${l.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DialPulse_Activity_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const getActionBadge = (action: string, isApprovalGated?: boolean) => {
    if (action.includes('DENIED')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-200 text-[11px] font-semibold">
          <Lock className="w-3 h-3" />
          <span>ACCESS DENIED</span>
        </span>
      );
    }
    if (isApprovalGated || action.includes('EXPORT')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 text-[11px] font-semibold">
          <ShieldAlert className="w-3 h-3" />
          <span>APPROVAL GATED</span>
        </span>
      );
    }
    if (action.includes('LOGIN') || action.includes('SWITCH')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 text-[11px] font-semibold">
          <UserCheck className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    if (action.includes('TRANSCRIBED')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-200 text-[11px] font-semibold">
          <Activity className="w-3 h-3" />
          <span>{action}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0] text-[11px] font-semibold">
        <CheckCircle2 className="w-3 h-3 text-[#00695C] dark:text-[#80D5C4]" />
        <span>{action}</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF8] dark:bg-[#111413] text-[#191C1B] dark:text-[#E1E3E0] overflow-hidden">
      {/* View Header */}
      <div className="p-4 lg:p-6 pb-3 bg-[#F8FAF8] dark:bg-[#111413] border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40 space-y-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-[#CCE8E1] dark:bg-[#005046] text-[#00201B] dark:text-[#A3F2E4] flex items-center justify-center shrink-0 shadow-xs">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-[#191C1B] dark:text-[#E1E3E0]">
                  System Activity &amp; Audit Logs
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#00695C] text-white text-[10px] font-mono uppercase font-bold">
                  Immutable
                </span>
              </div>
              <p className="text-xs text-[#6F7976] dark:text-[#89938F]">
                Real-time tracking of authorization decisions, gated exports, and operator actions.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              id="btn-refresh-audit-logs"
              onClick={() => fetchLogs(true)}
              disabled={isRefreshing}
              aria-label="Refresh activity logs"
              className="touch-target-48 rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-white dark:bg-[#191C1B] text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors flex items-center justify-center"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00695C]' : ''}`} />
            </button>

            <button
              type="button"
              id="btn-export-audit-logs"
              onClick={handleExportFilteredLogs}
              disabled={filteredLogs.length === 0}
              className="min-h-[44px] px-4 rounded-full border border-[#BEC9C5] dark:border-[#3F4946] text-xs font-semibold text-[#191C1B] dark:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] flex items-center space-x-2 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Metrics Tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#191C1B] border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#6F7976] dark:text-[#89938F] uppercase font-semibold tracking-wider">
                Total Events
              </p>
              <p className="text-xl font-bold font-mono text-[#191C1B] dark:text-[#E1E3E0] mt-0.5">
                {metrics.total}
              </p>
            </div>
            <Activity className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#191C1B] border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-red-600 dark:text-red-400 uppercase font-semibold tracking-wider">
                Access Denied
              </p>
              <p className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-0.5">
                {metrics.denied}
              </p>
            </div>
            <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#191C1B] border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 uppercase font-semibold tracking-wider">
                Approval Gated
              </p>
              <p className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                {metrics.approvalGated}
              </p>
            </div>
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#191C1B] border border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#6F7976] dark:text-[#89938F] uppercase font-semibold tracking-wider">
                Active Actors
              </p>
              <p className="text-xl font-bold font-mono text-[#191C1B] dark:text-[#E1E3E0] mt-0.5">
                {metrics.actors}
              </p>
            </div>
            <UserCheck className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
          </div>
        </div>

        {/* Search and Filters Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-[#6F7976] dark:text-[#89938F] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by action, user, IP, or keywords..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-11 pl-10 pr-9 text-xs bg-[#ECEFEC] dark:bg-[#1D201F] text-[#191C1B] dark:text-[#E1E3E0] rounded-full border border-transparent focus:border-[#00695C] focus:ring-2 focus:ring-[#00695C]/20 focus:outline-none placeholder-[#6F7976]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6F7976] hover:text-[#191C1B] rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category selector */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="Filter by event category"
              className="h-10 px-3 text-xs font-medium rounded-full dark:bg-[#1D201F] border-[#BEC9C5]/50 dark:border-[#3F4946]/50 focus:ring-[#00695C]/30 m3-select-bare bg-transparent border-none"
            >
              <option value="all">All Categories</option>
              <option value="security">Security &amp; Denials</option>
              <option value="exports">Data Exports (Gated)</option>
              <option value="mutations">Data Mutations</option>
              <option value="auth">Auth &amp; Roles</option>
              <option value="comms">Communications</option>
            </select>

            {/* Role selector */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by user role"
              className="h-10 px-3 text-xs font-medium rounded-full dark:bg-[#1D201F] border-[#BEC9C5]/50 dark:border-[#3F4946]/50 focus:ring-[#00695C]/30 m3-select-bare bg-transparent border-none"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owner</option>
              <option value="cto">CTO</option>
              <option value="it">IT Admin</option>
              <option value="tl_head">TL Head</option>
              <option value="tl">Team Lead</option>
              <option value="telecaller">Telecaller</option>
            </select>

            {/* Status / Gating selector */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="Filter by authorization status"
              className="h-10 px-3 text-xs font-medium rounded-full dark:bg-[#1D201F] border-[#BEC9C5]/50 dark:border-[#3F4946]/50 focus:ring-[#00695C]/30 m3-select-bare bg-transparent border-none"
            >
              <option value="all">All Statuses</option>
              <option value="denied">Access Denied Only</option>
              <option value="approval_gated">Approval Gated Only</option>
              <option value="standard">Standard Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="space-y-3 flex-1 overflow-hidden">
            <SkeletonBox className="h-12 w-full" rounded="rounded-2xl" />
            {[...Array(7)].map((_, i) => (
              <SkeletonBox key={i} className="h-16 w-full" rounded="rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl bg-[#FFDAD6] text-[#410002] flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Failed to Load Activity Logs</p>
              <p className="text-xs mt-1">{error}</p>
              <button
                type="button"
                onClick={() => fetchLogs()}
                className="mt-3 px-4 py-1.5 rounded-full bg-[#BA1A1A] text-white text-xs font-semibold"
              >
                Retry
              </button>
            </div>
          </div>
        ) : paginatedLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#ECEFEC] dark:bg-[#272B2A] flex items-center justify-center text-[#6F7976] mb-3">
              <Shield className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-[#191C1B] dark:text-[#E1E3E0]">
              No audit events matched your filter criteria.
            </p>
            <p className="text-xs text-[#6F7976] dark:text-[#89938F] mt-1 max-w-sm">
              Try adjusting your search keywords or resetting category filters to display all logged events.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              className="mt-4 px-5 py-2 rounded-full bg-[#00695C] text-white text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white dark:bg-[#191C1B] rounded-3xl border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 overflow-hidden shadow-xs">
            {/* Scrollable Table Container */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                {/* Table Header */}
                <thead className="sticky top-0 z-10 bg-[#ECEFEC] dark:bg-[#272B2A] text-[#3F4946] dark:text-[#BEC9C5] font-semibold border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-44">Timestamp</th>
                    <th className="py-3.5 px-4 w-44">Event / Action</th>
                    <th className="py-3.5 px-4 w-48">Actor &amp; Role</th>
                    <th className="py-3.5 px-4 w-28 hidden md:table-cell">Scope</th>
                    <th className="py-3.5 px-4 w-32 hidden lg:table-cell">IP Address</th>
                    <th className="py-3.5 px-4 flex-1">Details &amp; Audit Trail</th>
                    <th className="py-3.5 px-4 w-12 text-center">Info</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-[#BEC9C5]/20 dark:divide-[#3F4946]/20">
                  {paginatedLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => toggleExpand(log.id)}
                          className={`hover:bg-[#F2F5F2] dark:hover:bg-[#202322] cursor-pointer transition-colors ${
                            log.action.includes('DENIED')
                              ? 'bg-red-50/40 dark:bg-red-950/20'
                              : log.requiredApproval
                              ? 'bg-amber-50/40 dark:bg-amber-950/20'
                              : ''
                          }`}
                        >
                          {/* Timestamp */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-[#6F7976] dark:text-[#89938F] font-mono text-[11px]">
                            {formatTimestamp(log.timestamp)}
                          </td>

                          {/* Event / Action badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getActionBadge(log.action, log.requiredApproval)}
                          </td>

                          {/* Actor & Role */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-[#00695C] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {log.userName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-[#191C1B] dark:text-[#E1E3E0] truncate">
                                  {log.userName}
                                </p>
                                <p className="text-[10px] text-[#6F7976] dark:text-[#89938F] uppercase font-mono">
                                  {log.userRole}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Scope */}
                          <td className="py-3.5 px-4 hidden md:table-cell whitespace-nowrap">
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[#ECEFEC] dark:bg-[#272B2A] text-[#3F4946] dark:text-[#BEC9C5] uppercase font-bold">
                              {log.scope || 'SYSTEM'}
                            </span>
                          </td>

                          {/* IP Address */}
                          <td className="py-3.5 px-4 hidden lg:table-cell whitespace-nowrap font-mono text-[11px] text-[#6F7976] dark:text-[#89938F]">
                            {log.ip}
                          </td>

                          {/* Details */}
                          <td className="py-3.5 px-4">
                            <p className="text-[#191C1B] dark:text-[#E1E3E0] font-sans leading-relaxed line-clamp-2">
                              {log.details}
                            </p>
                          </td>

                          {/* Expand chevron */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              aria-label="Expand audit details"
                              className="p-1 rounded-full text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0]"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable JSON Detail Drawer */}
                        {isExpanded && (
                          <tr className="bg-[#ECEFEC]/70 dark:bg-[#151817]">
                            <td colSpan={7} className="p-4 px-6 border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-[#6F7976] dark:text-[#89938F]">
                                  <span>Full Audit Event Metadata (JSON)</span>
                                  <span className="font-mono text-[10px]">ID: {log.id}</span>
                                </div>
                                <pre className="p-3 rounded-2xl bg-white dark:bg-[#111413] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 text-[11px] font-mono text-[#00695C] dark:text-[#80D5C4] overflow-x-auto leading-relaxed">
                                  {JSON.stringify(log, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Footer */}
            <div className="p-3 px-4 bg-[#F8FAF8] dark:bg-[#1D201F] border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between text-xs shrink-0">
              <span className="text-[#6F7976] dark:text-[#89938F]">
                Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} -{' '}
                {Math.min(currentPage * pageSize, totalCount)} of {totalCount} events
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded-full border border-[#BEC9C5] dark:border-[#3F4946] text-xs font-medium disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="font-mono text-xs font-semibold">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded-full border border-[#BEC9C5] dark:border-[#3F4946] text-xs font-medium disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
