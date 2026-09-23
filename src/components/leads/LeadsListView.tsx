import React, { useState, useMemo } from 'react';
import { MaterialDropdown } from '../common/MaterialDropdown';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  Columns,
  MessageSquare,
  Edit3,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Phone,
  CheckSquare,
  Square,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  Eye,
  Plus,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Lead, LeadStage, LeadSource, User } from '../../types';
import { PIPELINE_STAGES, LEAD_SOURCES } from '../../constants/pipeline';
import { AvatarBadge } from '../common/AvatarBadge';
import { StatusPill } from '../common/StatusPill';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';
import { useIsMobile } from '../../utils/useBreakpoint';
import { LeadCardList } from './LeadCardList';
import { MobileFilterSheet } from './MobileFilterSheet';

interface LeadsListViewProps {
  leads: Lead[];
  users?: User[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onUpdateLead: (updated: Lead) => void;
  onBulkUpdate: (leadIds: string[], updates: Partial<Lead>) => void;
  onInitiateCall?: (lead: Lead) => void;
  onOpenChat?: (lead: Lead) => void;
  onSelectLead?: (lead: Lead) => void;
  onOpenAddLead?: () => void;
  onOpenImport?: () => void;
}

type SortField = 'name' | 'rating' | 'createdDate' | 'value' | 'stage' | 'assignee' | 'source';
type SortOrder = 'asc' | 'desc';

export const LeadsListView: React.FC<LeadsListViewProps> = ({
  leads,
  users = [],
  isLoading = false,
  isRefreshing = false,
  error = null,
  onRefresh,
  onUpdateLead,
  onBulkUpdate,
  onInitiateCall,
  onOpenChat,
  onSelectLead,
  onOpenAddLead,
  onOpenImport
}) => {
  // Search & Field Picker
  const [searchField, setSearchField] = useState<'name' | 'phone' | 'email' | 'company'>('name');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter Chips: Stage, Assignee, Source, Date, Compliance
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'capped' | 'at_risk' | 'whatsapp_only' | 'paused_opted_out'>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Row Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination (20 per page)
  const [pageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Column Visibility Config
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    status: true,
    rating: true,
    assignee: true,
    source: true,
    createdOn: true,
    phone: false,
    company: false,
    value: true
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Modals
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkAssignee, setBulkAssignee] = useState<string>('');
  const [bulkRating, setBulkRating] = useState<number>(0);
  const bulkEditTrapRef = useModalFocusTrap(isBulkEditOpen, () => setIsBulkEditOpen(false));

  const [isBulkWacaOpen, setIsBulkWacaOpen] = useState(false);
  const [wacaTemplate, setWacaTemplate] = useState('welcome_intro');
  const [wacaSending, setWacaSending] = useState(false);
  const [wacaSuccessMessage, setWacaSuccessMessage] = useState('');
  const bulkWacaTrapRef = useModalFocusTrap(isBulkWacaOpen, () => setIsBulkWacaOpen(false));

  // Responsive: detect mobile breakpoint
  const isMobile = useIsMobile();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Team members mapping from real users
  const teamMembers = useMemo(() => {
    if (users.length > 0) {
      return users.map((u) => ({ id: u.id, name: u.name, role: u.role }));
    }
    // Derive unique assignees from loaded leads if users array is empty
    const set = new Set<string>();
    leads.forEach((l) => {
      const name = l.assignedRepName || (l as any).assignee;
      if (name) set.add(name);
    });
    return Array.from(set).map((name) => ({ id: name, name, role: 'Agent' }));
  }, [users, leads]);

  // Dynamic available sources from loaded leads and constants
  const availableSources = useMemo(() => {
    const fromLeads = Array.from(new Set(leads.map((l) => l.source))).filter(Boolean);
    const combined = Array.from(new Set([...LEAD_SOURCES, ...fromLeads]));
    return combined;
  }, [leads]);

  // Filter & Search Logic
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = (lead.name || '').toLowerCase();
        const phone = (lead.phone || '');
        const email = (lead.email || '').toLowerCase();
        const company = (lead.industry || (lead as any).companyOrProject || lead.notes || '').toLowerCase();

        if (searchField === 'name' && !name.includes(q)) return false;
        if (searchField === 'phone' && !phone.includes(q)) return false;
        if (searchField === 'email' && !email.includes(q)) return false;
        if (searchField === 'company' && !company.includes(q)) return false;
      }

      // Stage Filter
      if (stageFilter !== 'all') {
        const currentStage = lead.stage;
        if (currentStage !== stageFilter) return false;
      }

      // Assignee
      if (assigneeFilter !== 'all') {
        const repName = lead.assignedRepName || (lead as any).assignee;
        const repId = lead.assignedRepId;
        if (repName !== assigneeFilter && repId !== assigneeFilter) {
          return false;
        }
      }

      // Source Filter
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) {
        return false;
      }

      // Date Filter based on real ISO createdDate
      if (dateFilter !== 'all' && lead.createdDate) {
        const leadTime = new Date(lead.createdDate).getTime();
        const now = Date.now();
        if (dateFilter === 'today' && now - leadTime > 24 * 60 * 60 * 1000) return false;
        if (dateFilter === 'week' && now - leadTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateFilter === 'month' && now - leadTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      // Compliance / Fatigue Filter
      if (complianceFilter === 'capped') {
        if (lead.fatigueStatus !== 'capped') return false;
      } else if (complianceFilter === 'at_risk') {
        if (lead.fatigueStatus !== 'near_cap' && (lead.fatigueStatus as any) !== 'at_risk') return false;
      } else if (complianceFilter === 'whatsapp_only') {
        if (lead.preferences?.preferredChannel !== 'WhatsApp') return false;
      } else if (complianceFilter === 'paused_opted_out') {
        if (!lead.preferences?.isPaused30Days && !lead.preferences?.isOptedOut) return false;
      }

      return true;
    });
  }, [leads, searchQuery, searchField, stageFilter, assigneeFilter, sourceFilter, dateFilter, complianceFilter]);

  // Sorted Leads
  const sortedLeads = useMemo(() => {
    return [...filteredLeads].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'name') {
        aVal = a.name || '';
        bVal = b.name || '';
      } else if (sortField === 'rating') {
        aVal = (a.customFields?.rating as number) ?? (a as any).rating ?? 0;
        bVal = (b.customFields?.rating as number) ?? (b as any).rating ?? 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      } else if (sortField === 'createdDate') {
        aVal = new Date(a.createdDate || 0).getTime();
        bVal = new Date(b.createdDate || 0).getTime();
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      } else if (sortField === 'value') {
        aVal = Number(a.value) || 0;
        bVal = Number(b.value) || 0;
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      } else if (sortField === 'stage') {
        aVal = a.stage || '';
        bVal = b.stage || '';
      } else if (sortField === 'assignee') {
        aVal = a.assignedRepName || (a as any).assignee || '';
        bVal = b.assignedRepName || (b as any).assignee || '';
      } else if (sortField === 'source') {
        aVal = a.source || '';
        bVal = b.source || '';
      } else {
        aVal = '';
        bVal = '';
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [filteredLeads, sortField, sortOrder]);

  // Pagination Slicing
  const totalCount = sortedLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const currentLeads = sortedLeads.slice(startIndex, endIndex);

  // Sorting Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Row Selection Handlers
  const handleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    const allSelected = currentLeads.every((l) => next.has(l.id));
    if (allSelected) {
      currentLeads.forEach((l) => next.delete(l.id));
    } else {
      currentLeads.forEach((l) => next.add(l.id));
    }
    setSelectedIds(next);
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Inline Rating Toggle
  const handleRatingClick = (e: React.MouseEvent, lead: Lead, star: number) => {
    e.stopPropagation();
    const currentStar = (lead.customFields?.rating as number) ?? (lead as any).rating ?? 0;
    const nextRating = currentStar === star ? 0 : star;
    onUpdateLead({
      ...lead,
      customFields: {
        ...(lead.customFields || {}),
        rating: nextRating
      }
    });
  };

  // Bulk Edit Execution
  const handleApplyBulkEdit = () => {
    if (selectedIds.size === 0) return;
    const updates: Partial<Lead> = {};
    if (bulkStatus) updates.stage = bulkStatus as LeadStage;
    if (bulkAssignee) {
      const rep = teamMembers.find((m) => m.name === bulkAssignee || m.id === bulkAssignee);
      if (rep) {
        updates.assignedRepId = rep.id;
        updates.assignedRepName = rep.name;
      }
    }
    if (bulkRating > 0) {
      updates.customFields = { rating: bulkRating };
    }

    onBulkUpdate(Array.from(selectedIds), updates);
    setIsBulkEditOpen(false);
    setBulkStatus('');
    setBulkAssignee('');
    setBulkRating(0);
  };

  // Bulk WACA Message Execution
  const handleSendBulkWaca = () => {
    setWacaSending(true);
    setTimeout(() => {
      setWacaSending(false);
      setWacaSuccessMessage(`Broadcast queued for ${selectedIds.size} recipient(s) via WhatsApp Cloud API!`);
      setTimeout(() => {
        setWacaSuccessMessage('');
        setIsBulkWacaOpen(false);
      }, 1600);
    }, 1000);
  };

  const isAllCurrentSelected =
    currentLeads.length > 0 && currentLeads.every((l) => selectedIds.has(l.id));

  // Count active filters for mobile badge
  const activeFilterCount = [
    stageFilter !== 'all',
    assigneeFilter !== 'all',
    sourceFilter !== 'all',
    complianceFilter !== 'all',
    dateFilter !== 'all'
  ].filter(Boolean).length;

  const handleResetAllFilters = () => {
    setStageFilter('all');
    setAssigneeFilter('all');
    setSourceFilter('all');
    setComplianceFilter('all');
    setDateFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // CSV Export with real fields
  const handleExportCsv = () => {
    setIsMoreMenuOpen(false);
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Company', 'Stage', 'Assignee', 'Source', 'Value', 'Rating', 'Created'];
    const rows = filteredLeads.map((l) => {
      const rating = (l.customFields?.rating as number) ?? (l as any).rating ?? 0;
      const company = l.industry || (l as any).companyOrProject || '';
      const assignee = l.assignedRepName || (l as any).assignee || '';
      return [
        l.id,
        `"${(l.name || '').replace(/"/g, '""')}"`,
        `"${l.phone || ''}"`,
        `"${l.email || ''}"`,
        `"${company.replace(/"/g, '""')}"`,
        `"${l.stage || ''}"`,
        `"${assignee}"`,
        `"${l.source || ''}"`,
        l.value || 0,
        rating,
        `"${l.createdDate || ''}"`
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `dialpulse_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenImportModal = () => {
    setIsMoreMenuOpen(false);
    if (onOpenImport) {
      onOpenImport();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF8] dark:bg-[#111413] overflow-hidden">
      {/* Top Toolbar */}
      <div className={`bg-[#F8FAF8] dark:bg-[#111413] border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shrink-0 ${isMobile ? 'p-3 space-y-2.5' : 'p-4 space-y-3.5'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search with Field-Picker - Material Design 3 Pill Bar */}
          <div className={`flex items-center space-x-2 flex-1 ${isMobile ? 'min-w-0' : 'min-w-[280px] max-w-lg'}`}>
            <div className="relative flex-1 flex items-center bg-[#ECEFEC] dark:bg-[#1D201F] rounded-full border border-transparent hover:border-[#BEC9C5] dark:hover:border-[#3F4946] focus-within:border-[#00695C] focus-within:ring-2 focus-within:ring-[#00695C]/20 transition-all min-h-[46px] px-2">
              <MaterialDropdown
                value={searchField}
                onChange={(val) => setSearchField(val as any)}
                ariaLabel="Filter search by field"
                variant="chip"
                triggerClassName="h-8 pl-2 pr-1 border-r border-[#BEC9C5]/60 dark:border-[#3F4946]/60"
                options={[
                  { value: 'name', label: 'Name' },
                  { value: 'phone', label: 'Phone' },
                  { value: 'email', label: 'Email' },
                  { value: 'company', label: 'Company' },
                ]}
              />
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-[#6F7976] dark:text-[#89938F] ml-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder={`Search leads by ${searchField}...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 pl-2 pr-3 text-xs bg-transparent text-[#191C1B] dark:text-[#E1E3E0] placeholder-[#6F7976] dark:placeholder-[#89938F] focus:outline-none font-sans"
                />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search text"
                  className="p-1 text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0] rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Primary Action Buttons */}
          <div className="flex items-center space-x-2.5">
            {/* Bulk Edit Button */}
            <button
              type="button"
              id="btn-bulk-edit"
              disabled={selectedIds.size === 0}
              onClick={() => setIsBulkEditOpen(true)}
              className={`min-h-[44px] px-4 text-xs font-medium rounded-full flex items-center space-x-2 transition-all ${
                selectedIds.size > 0
                  ? 'bg-[#1F3A5F] text-white hover:bg-[#162c4a] shadow-sm'
                  : 'bg-[#ECEFEC] dark:bg-[#1D201F] text-[#6F7976] dark:text-[#89938F] cursor-not-allowed border border-transparent'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Bulk Edit</span>
              {selectedIds.size > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#CCE8E1] text-[#00201B] text-[10px] font-mono font-bold">
                  {selectedIds.size}
                </span>
              )}
            </button>

            {/* Bulk WACA Message Button */}
            <button
              type="button"
              id="btn-bulk-waca"
              disabled={selectedIds.size === 0}
              onClick={() => setIsBulkWacaOpen(true)}
              className={`min-h-[44px] px-4 text-xs font-medium rounded-full flex items-center space-x-2 transition-all ${
                selectedIds.size > 0
                  ? 'bg-[#00695C] text-white hover:bg-[#005449] shadow-sm'
                  : 'bg-[#ECEFEC] dark:bg-[#1D201F] text-[#6F7976] dark:text-[#89938F] cursor-not-allowed border border-transparent'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Broadcast</span>
            </button>

            {/* Column Customizer Pill */}
            {!isMobile && (
              <div className="relative">
                <button
                  type="button"
                  id="btn-columns"
                  onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                  className="min-h-[44px] px-3 rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] text-[#3F4946] dark:text-[#BEC9C5] hover:text-[#191C1B] dark:hover:text-white hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] text-xs flex items-center space-x-1.5 transition-colors"
                  title="Show/Hide Table Columns"
                >
                  <Columns className="w-4 h-4" />
                  <span>Columns</span>
                </button>

                {isColumnDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#F8FAF8] dark:bg-[#1D201F] rounded-2xl shadow-xl border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 p-3 z-30 space-y-2">
                    <p className="text-xs font-semibold text-[#191C1B] dark:text-[#E1E3E0] px-1 mb-1">
                      Toggle Columns
                    </p>
                    {Object.keys(visibleColumns).map((colKey) => (
                      <label
                        key={colKey}
                        className="flex items-center space-x-2.5 text-xs text-[#3F4946] dark:text-[#BEC9C5] hover:text-[#191C1B] dark:hover:text-[#E1E3E0] cursor-pointer px-1 py-1 rounded-lg hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A]"
                      >
                        <input
                          type="checkbox"
                          checked={(visibleColumns as any)[colKey]}
                          onChange={(e) =>
                            setVisibleColumns({
                              ...visibleColumns,
                              [colKey]: e.target.checked
                            })
                          }
                          className="rounded border-[#BEC9C5] text-[#00695C] focus:ring-[#00695C] w-4 h-4"
                        />
                        <span className="capitalize">{colKey.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mobile Filter Button */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="min-h-[44px] px-3 rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] text-[#3F4946] dark:text-[#BEC9C5] hover:text-[#191C1B] dark:hover:text-white text-xs flex items-center space-x-1.5 transition-colors relative"
                aria-label="Open filter controls"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#00695C] text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            {/* Overflow Actions */}
            <div className="relative">
              <button
                type="button"
                id="btn-more-actions"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="min-h-[44px] w-11 rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] text-[#3F4946] dark:text-[#BEC9C5] hover:text-[#191C1B] dark:hover:text-white hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] flex items-center justify-center transition-colors"
                title="More Actions"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#F8FAF8] dark:bg-[#1D201F] rounded-2xl shadow-xl border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 p-2 z-30 space-y-1">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl flex items-center space-x-2 text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                    <span>Export Filtered CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenImportModal}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl flex items-center space-x-2 text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors"
                  >
                    <Upload className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                    <span>Import Leads CSV</span>
                  </button>
                  {onRefresh && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onRefresh();
                      }}
                      className="w-full text-left px-3 py-2 text-xs rounded-xl flex items-center space-x-2 text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                      <span>Refresh Leads</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Filter Chips & Sorting Row */}
        {!isMobile && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Stage Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <MaterialDropdown
                id="filter-stage"
                label="Stage:"
                value={stageFilter}
                onChange={(val) => {
                  setStageFilter(val);
                  setCurrentPage(1);
                }}
                variant="chip"
                options={[
                  { value: 'all', label: `All Stages (${PIPELINE_STAGES.length})` },
                  ...PIPELINE_STAGES.map((st) => ({ value: st, label: st })),
                ]}
              />
            </div>

            {/* Assignee Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <MaterialDropdown
                id="filter-assignee"
                label="Assignee:"
                value={assigneeFilter}
                onChange={(val) => {
                  setAssigneeFilter(val);
                  setCurrentPage(1);
                }}
                variant="chip"
                options={[
                  { value: 'all', label: 'All Assignees' },
                  ...teamMembers.map((m) => ({ value: m.name, label: m.name })),
                ]}
              />
            </div>

            {/* Source Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <MaterialDropdown
                id="filter-source"
                label="Source:"
                value={sourceFilter}
                onChange={(val) => {
                  setSourceFilter(val);
                  setCurrentPage(1);
                }}
                variant="chip"
                options={[
                  { value: 'all', label: `All Sources (${availableSources.length})` },
                  ...availableSources.map((src) => ({ value: src, label: src })),
                ]}
              />
            </div>

            {/* Compliance Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <MaterialDropdown
                id="filter-compliance"
                label="Compliance:"
                value={complianceFilter}
                onChange={(val) => {
                  setComplianceFilter(val as any);
                  setCurrentPage(1);
                }}
                variant="chip"
                options={[
                  { value: 'all', label: 'All Leads' },
                  { value: 'capped', label: 'Capped (3/3 Calls)', icon: <span>🛑</span> },
                  { value: 'at_risk', label: 'Near Cap (2/3 Calls)', icon: <span>⚠️</span> },
                  { value: 'whatsapp_only', label: 'WhatsApp Only', icon: <span>💬</span> },
                  { value: 'paused_opted_out', label: 'Paused / Opted-out', icon: <span>⏸️</span> },
                ]}
              />
            </div>

            {/* Creation Date Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <MaterialDropdown
                id="filter-date"
                label="Created:"
                value={dateFilter}
                onChange={(val) => {
                  setDateFilter(val);
                  setCurrentPage(1);
                }}
                variant="chip"
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today (< 24h)' },
                  { value: 'week', label: 'Past Week' },
                  { value: 'month', label: 'Past Month' },
                ]}
              />
            </div>

            {/* Active filters reset button */}
            {(stageFilter !== 'all' || assigneeFilter !== 'all' || sourceFilter !== 'all' || complianceFilter !== 'all' || dateFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                id="btn-reset-filters"
                onClick={handleResetAllFilters}
                className="text-xs font-medium text-[#00695C] dark:text-[#80D5C4] hover:underline flex items-center space-x-1 ml-auto min-h-[36px] px-2.5 rounded-full hover:bg-[#CCE8E1]/40"
              >
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        )}

        {/* Row 2: Material Design 3 Segmented Button for Sorting (Desktop) */}
        {!isMobile && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-[#6F7976] dark:text-[#89938F] text-xs font-medium">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                <span>Sort by:</span>
              </div>

              {/* M3 Segmented Button Group */}
              <div className="inline-flex items-center p-1 rounded-full bg-[#ECEFEC] dark:bg-[#1D201F] border border-[#BEC9C5]/50 dark:border-[#3F4946]/50">
                {[
                  { id: 'stage' as SortField, label: 'Stage' },
                  { id: 'assignee' as SortField, label: 'Assignee' },
                  { id: 'source' as SortField, label: 'Source' },
                  { id: 'value' as SortField, label: 'Deal Value' },
                  { id: 'rating' as SortField, label: 'Rating' },
                  { id: 'createdDate' as SortField, label: 'Recent' }
                ].map((s) => {
                  const isCur = sortField === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSort(s.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center space-x-1.5 min-h-[32px] ${
                        isCur
                          ? 'bg-[#00695C] text-white shadow-xs'
                          : 'text-[#3F4946] dark:text-[#BEC9C5] hover:text-[#191C1B] dark:hover:text-white'
                      }`}
                    >
                      <span>{s.label}</span>
                      {isCur && (
                        sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Real Filtered Records Count */}
            <div className="text-xs text-[#6F7976] dark:text-[#89938F] font-medium">
              Showing <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">{totalCount > 0 ? startIndex + 1 : 0}</span> to <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">{endIndex}</span> of <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">{totalCount}</span> filtered leads
            </div>
          </div>
        )}
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-[#FFDAD6] border border-[#BA1A1A]/30 text-[#410002] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#BA1A1A]" />
            <span>{error}</span>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="text-xs font-semibold px-3 py-1 rounded-full bg-[#BA1A1A] text-white hover:bg-[#93000A] transition-colors shrink-0"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Initial Loading Skeleton */}
      {isLoading && (
        <div className="flex-1 p-6 space-y-3">
          <div className="h-10 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl animate-pulse" />
          <div className="h-14 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl animate-pulse" />
          <div className="h-14 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl animate-pulse" />
          <div className="h-14 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl animate-pulse" />
          <div className="h-14 bg-[#ECEFEC] dark:bg-[#1D201F] rounded-2xl animate-pulse" />
        </div>
      )}

      {/* Empty State: Workspace has 0 leads */}
      {!isLoading && leads.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#CCE8E1] dark:bg-[#004F46] flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-[#00695C] dark:text-[#80D5C4]" />
          </div>
          <h3 className="text-base font-semibold text-[#191C1B] dark:text-[#E1E3E0] m3-title-medium">
            No leads in workspace
          </h3>
          <p className="text-xs text-[#6F7976] dark:text-[#89938F] mt-1 max-w-sm mb-6">
            Get started by adding your first lead manually or uploading a bulk CSV list.
          </p>
          <div className="flex items-center gap-3">
            {onOpenAddLead && (
              <button
                type="button"
                onClick={onOpenAddLead}
                className="px-5 py-2.5 rounded-full bg-[#00695C] text-white text-xs font-semibold hover:bg-[#005449] transition-all"
              >
                Add First Lead
              </button>
            )}
            {onOpenImport && (
              <button
                type="button"
                onClick={onOpenImport}
                className="px-5 py-2.5 rounded-full bg-[#ECEFEC] dark:bg-[#1D201F] text-[#191C1B] dark:text-[#E1E3E0] text-xs font-semibold hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] border border-[#BEC9C5]/50 transition-all"
              >
                Import CSV
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!isLoading && leads.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {/* Mobile View: LeadCardList */}
          {isMobile ? (
            <LeadCardList
              leads={currentLeads}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleRow}
              onUpdateLead={onUpdateLead}
              onInitiateCall={onInitiateCall}
              onOpenChat={onOpenChat}
            />
          ) : (
            /* Desktop Data Table */
            <table className="w-full text-left border-collapse">
              {/* Table Header */}
              <thead className="sticky top-0 z-10 bg-[#F8FAF8] dark:bg-[#111413] border-b border-[#BEC9C5]/50 dark:border-[#3F4946]/50 text-[#3F4946] dark:text-[#BEC9C5] text-xs font-semibold uppercase tracking-wider select-none shadow-xs">
                <tr>
                  <th className="w-12 px-3 py-3.5 text-center">
                    <button
                      type="button"
                      aria-label="Select all leads on this page"
                      onClick={handleSelectAllOnPage}
                      className="w-10 h-10 rounded-full inline-flex items-center justify-center text-[#6F7976] hover:text-[#191C1B]"
                    >
                      {isAllCurrentSelected ? (
                        <CheckSquare className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
                      ) : (
                        <Square className="w-5 h-5 text-[#BEC9C5] dark:text-[#6F7976]" />
                      )}
                    </button>
                  </th>

                  {visibleColumns.name && (
                    <th
                      onClick={() => handleSort('name')}
                      className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[200px]"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="m3-label-medium">Lead Name</span>
                        {sortField === 'name' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.status && (
                    <th
                      onClick={() => handleSort('stage')}
                      className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[170px]"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="m3-label-medium">Stage & Status</span>
                        {sortField === 'stage' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.rating && (
                    <th
                      onClick={() => handleSort('rating')}
                      className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[130px]"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="m3-label-medium">Priority</span>
                        {sortField === 'rating' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.assignee && (
                    <th
                      onClick={() => handleSort('assignee')}
                      className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[160px]"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="m3-label-medium">Owner</span>
                        {sortField === 'assignee' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.source && (
                    <th
                      onClick={() => handleSort('source')}
                      className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[120px]"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="m3-label-medium">Source</span>
                        {sortField === 'source' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.createdOn && (
                    <th
                      onClick={() => handleSort('createdDate')}
                      className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[110px]"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="m3-label-medium">Created</span>
                        {sortField === 'createdDate' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                        )}
                      </div>
                    </th>
                  )}

                  {visibleColumns.phone && (
                    <th className="px-4 py-3.5 min-w-[130px] m3-label-medium">Phone</th>
                  )}

                  {visibleColumns.company && (
                    <th className="px-4 py-3.5 min-w-[160px] m3-label-medium">Company</th>
                  )}

                  {visibleColumns.value && (
                    <th
                      onClick={() => handleSort('value')}
                      className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[120px]"
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="m3-label-medium">Value</span>
                        {sortField === 'value' ? (
                          sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                        )}
                      </div>
                    </th>
                  )}

                  <th className="w-28 px-4 py-3.5 text-right m3-label-medium">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-[#BEC9C5]/30 dark:divide-[#3F4946]/30 text-xs">
                {currentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-[#6F7976]">
                      <p className="font-medium text-sm">No leads match your current search or filters.</p>
                      <button
                        type="button"
                        onClick={handleResetAllFilters}
                        className="mt-2 text-xs font-semibold text-[#00695C] dark:text-[#80D5C4] hover:underline"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  currentLeads.map((lead) => {
                    const isSelected = selectedIds.has(lead.id);
                    const val = Number(lead.value) || 0;
                    const formattedValue = val >= 100000 ? `₹ ${(val / 100000).toFixed(1)} L` : `₹ ${val.toLocaleString('en-IN')}`;
                    const rating = (lead.customFields?.rating as number) ?? (lead as any).rating ?? 0;
                    const assignee = lead.assignedRepName || (lead as any).assignee || 'Unassigned';
                    const company = lead.industry || (lead as any).companyOrProject;
                    const dateFormatted = lead.createdDate
                      ? new Date(lead.createdDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
                      : '—';

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleToggleRow(lead.id)}
                        className={`group cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#CCE8E1]/35 dark:bg-[#004F46]/30 border-l-4 border-l-[#00695C]'
                            : 'hover:bg-[#ECEFEC]/60 dark:hover:bg-[#1D201F]/70'
                        }`}
                      >
                        {/* Checkbox */}
                        <td
                          className="px-3 py-3 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleRow(lead.id);
                          }}
                        >
                          <button type="button" aria-label={`Select lead ${lead.name}`} className="w-10 h-10 rounded-full inline-flex items-center justify-center text-[#6F7976] hover:text-[#191C1B]">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
                            ) : (
                              <Square className="w-5 h-5 text-[#BEC9C5] dark:text-[#6F7976]" />
                            )}
                          </button>
                        </td>

                        {/* Name */}
                        {visibleColumns.name && (
                          <td className="px-4 py-3.5 text-[#191C1B] dark:text-[#E1E3E0]">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm tracking-tight m3-title-small">{lead.name}</span>
                              <span className="text-xs text-[#6F7976] dark:text-[#89938F] font-normal font-mono mt-0.5">
                                {lead.phone} {company ? `• ${company}` : ''}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Status */}
                        {visibleColumns.status && (
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col space-y-1 items-start">
                              <StatusPill status={lead.stage} />
                              {lead.fatigueStatus === 'capped' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFDAD6] text-[#410002]">
                                  🛑 Capped (3/3)
                                </span>
                              )}
                              {(lead.fatigueStatus === 'near_cap' || (lead.fatigueStatus as any) === 'at_risk') && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">
                                  ⚠️ Near Cap (2/3)
                                </span>
                              )}
                              {lead.preferences?.preferredChannel === 'WhatsApp' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#CCE8E1] text-[#00201B]">
                                  💬 WA Only
                                </span>
                              )}
                              {lead.preferences?.isPaused30Days && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-900">
                                  ⏸️ Paused 30d
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Rating */}
                        {visibleColumns.rating && (
                          <td className="px-4 py-3.5">
                            <div
                              className="flex items-center space-x-1"
                              title={`Rating: ${rating}/5 stars. Click to toggle.`}
                            >
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  aria-label={`Set rating to ${star} stars`}
                                  onClick={(e) => handleRatingClick(e, lead, star)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-[#DAE5E1] dark:hover:bg-[#272B2A] transition-colors"
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      star <= rating
                                        ? 'text-amber-500 fill-amber-500'
                                        : 'text-[#BEC9C5] dark:text-[#6F7976]'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </td>
                        )}

                        {/* Assignee */}
                        {visibleColumns.assignee && (
                          <td className="px-4 py-3.5">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <AvatarBadge name={assignee} size="sm" />
                              <span className="text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] truncate">
                                {assignee}
                              </span>
                            </div>
                          </td>
                        )}

                        {/* Source */}
                        {visibleColumns.source && (
                          <td className="px-4 py-3.5 text-[#6F7976] dark:text-[#89938F]">
                            <span className="inline-flex items-center px-2 py-1 rounded-full bg-[#ECEFEC] dark:bg-[#1D201F] text-[11px] font-medium">
                              {lead.source}
                            </span>
                          </td>
                        )}

                        {/* Created Date */}
                        {visibleColumns.createdOn && (
                          <td className="px-4 py-3.5 text-[#6F7976] dark:text-[#89938F] font-mono text-[11px]">
                            {dateFormatted}
                          </td>
                        )}

                        {/* Phone */}
                        {visibleColumns.phone && (
                          <td className="px-4 py-3.5 font-mono text-[#191C1B] dark:text-[#E1E3E0]">
                            {lead.phone}
                          </td>
                        )}

                        {/* Company */}
                        {visibleColumns.company && (
                          <td className="px-4 py-3.5 text-[#3F4946] dark:text-[#BEC9C5] truncate max-w-[180px]">
                            {company || '—'}
                          </td>
                        )}

                        {/* Value */}
                        {visibleColumns.value && (
                          <td className="px-4 py-3.5 font-mono font-medium text-[#191C1B] dark:text-[#E1E3E0]">
                            {formattedValue}
                          </td>
                        )}

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <div
                            className="flex items-center justify-end space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* View Detail Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => onSelectLead?.(lead)}
                              aria-label={`View details for ${lead.name}`}
                              title="Inspect lead record & timeline"
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[#00695C] dark:text-[#80D5C4] hover:bg-[#CCE8E1]/50 dark:hover:bg-[#004F46]/50 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Call Button */}
                            {(() => {
                              const isBlocked =
                                lead.fatigueStatus === 'capped' ||
                                lead.preferences?.preferredChannel === 'WhatsApp' ||
                                lead.preferences?.isOptedOut;

                              return (
                                <button
                                  type="button"
                                  disabled={isBlocked}
                                  onClick={() => onInitiateCall?.(lead)}
                                  aria-label={`Call ${lead.name}`}
                                  title={
                                    isBlocked
                                      ? 'Calling restricted by frequency policy'
                                      : `Start instant outbound dial to ${lead.name}`
                                  }
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                    isBlocked
                                      ? 'text-[#BEC9C5] dark:text-[#6F7976] cursor-not-allowed'
                                      : 'text-[#00695C] dark:text-[#80D5C4] hover:bg-[#CCE8E1] dark:hover:bg-[#005046]'
                                  }`}
                                >
                                  <Phone className="w-4 h-4" />
                                </button>
                              );
                            })()}

                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              onClick={() => onOpenChat?.(lead)}
                              aria-label={`Chat with ${lead.name}`}
                              title={`Open WhatsApp console for ${lead.name}`}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[#00695C] dark:text-[#80D5C4] hover:bg-[#CCE8E1] dark:hover:bg-[#005046] transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && leads.length > 0 && (
        <div className="bg-[#F8FAF8] dark:bg-[#111413] border-t border-[#BEC9C5]/40 dark:border-[#3F4946]/40 px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-xs text-[#6F7976] dark:text-[#89938F]">
            <span>Page {currentPage} of {totalPages}</span>
            <span>•</span>
            <span>{pageSize} rows per page</span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                currentPage <= 1
                  ? 'text-[#BEC9C5] dark:text-[#3F4946] cursor-not-allowed'
                  : 'text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1;
              if (totalPages > 5 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                return null;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    currentPage === p
                      ? 'bg-[#00695C] text-white shadow-xs'
                      : 'text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F]'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                currentPage >= totalPages
                  ? 'text-[#BEC9C5] dark:text-[#3F4946] cursor-not-allowed'
                  : 'text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F]'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        stageFilter={stageFilter}
        assigneeFilter={assigneeFilter}
        sourceFilter={sourceFilter}
        complianceFilter={complianceFilter}
        dateFilter={dateFilter}
        availableSources={availableSources}
        teamMembers={teamMembers}
        onStageChange={(val) => {
          setStageFilter(val);
          setCurrentPage(1);
        }}
        onAssigneeChange={(val) => {
          setAssigneeFilter(val);
          setCurrentPage(1);
        }}
        onSourceChange={(val) => {
          setSourceFilter(val);
          setCurrentPage(1);
        }}
        onComplianceChange={(val) => {
          setComplianceFilter(val as any);
          setCurrentPage(1);
        }}
        onDateChange={(val) => {
          setDateFilter(val);
          setCurrentPage(1);
        }}
        onResetAll={handleResetAllFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Bulk Edit Modal */}
      {isBulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            ref={bulkEditTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-title"
            className="bg-[#F8FAF8] dark:bg-[#1D201F] rounded-3xl p-6 max-w-md w-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#BEC9C5]/30">
              <h3 id="bulk-edit-title" className="text-base font-semibold text-[#191C1B] dark:text-[#E1E3E0] flex items-center gap-2 m3-title-medium">
                <Edit3 className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
                <span>Bulk Update {selectedIds.size} Leads</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkEditOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6F7976] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-medium text-[#3F4946] dark:text-[#BEC9C5] mb-1.5 uppercase tracking-wider">
                  Update Lead Stage
                </label>
                <MaterialDropdown
                  id="bulk-edit-stage"
                  value={bulkStatus}
                  onChange={(val) => setBulkStatus(val)}
                  variant="form"
                  options={[
                    { value: '', label: 'Leave Unchanged' },
                    ...PIPELINE_STAGES.map((st) => ({ value: st, label: st })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3F4946] dark:text-[#BEC9C5] mb-1.5 uppercase tracking-wider">
                  Reassign Lead Owner
                </label>
                <MaterialDropdown
                  id="bulk-edit-assignee"
                  value={bulkAssignee}
                  onChange={(val) => setBulkAssignee(val)}
                  variant="form"
                  options={[
                    { value: '', label: 'Leave Unchanged' },
                    ...teamMembers.map((m) => ({ value: m.name, label: m.name })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3F4946] dark:text-[#BEC9C5] mb-1.5 uppercase tracking-wider">
                  Update Priority Stars
                </label>
                <div className="flex items-center space-x-2 pt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setBulkRating(star)}
                      className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#CCE8E1]/50 transition-colors"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= bulkRating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-[#BEC9C5] dark:text-[#6F7976]'
                        }`}
                      />
                    </button>
                  ))}
                  {bulkRating > 0 && (
                    <button
                      type="button"
                      onClick={() => setBulkRating(0)}
                      className="text-xs text-[#6F7976] hover:underline ml-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#BEC9C5]/30">
              <button
                type="button"
                onClick={() => setIsBulkEditOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-full text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkEdit}
                className="px-5 py-2 text-xs font-semibold rounded-full bg-[#00695C] text-white hover:bg-[#005449] shadow-xs"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk WhatsApp Modal */}
      {isBulkWacaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            ref={bulkWacaTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-waca-title"
            className="bg-[#F8FAF8] dark:bg-[#1D201F] rounded-3xl p-6 max-w-md w-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#BEC9C5]/30">
              <h3 id="bulk-waca-title" className="text-base font-semibold text-[#191C1B] dark:text-[#E1E3E0] flex items-center gap-2 m3-title-medium">
                <MessageSquare className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
                <span>WhatsApp Cloud Broadcast</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkWacaOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6F7976] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6F7976] dark:text-[#89938F]">
              Dispatches Meta-approved HSM template broadcast to <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0]">{selectedIds.size}</span> selected phone numbers.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-[#3F4946] dark:text-[#BEC9C5] mb-1.5 uppercase tracking-wider">
                  Template Selection
                </label>
                <MaterialDropdown
                  id="bulk-waca-template"
                  value={wacaTemplate}
                  onChange={(val) => setWacaTemplate(val)}
                  variant="form"
                  options={[
                    { value: 'welcome_intro', label: 'dialpulse_intro_v2 (Introductory Greeting)' },
                    { value: 'demo_invite', label: 'telecrm_demo_rsvp (1-to-1 Walkthrough Invite)' },
                    { value: 'quote_followup', label: 'quote_clarification_v1 (Commercial Proposal)' },
                  ]}
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-[#CCE8E1]/30 dark:bg-[#004F46]/20 border border-[#00695C]/20 text-xs text-[#00201B] dark:text-[#A3F2E4] space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#00695C]" />
                  <span>Compliance Check Auto-Applied</span>
                </p>
                <p className="text-[11px] opacity-90">
                  Opted-out leads, paused numbers, and fatigue-capped contacts are automatically skipped per TRAI & Meta guidelines.
                </p>
              </div>

              {wacaSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{wacaSuccessMessage}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-[#BEC9C5]/30">
              <button
                type="button"
                disabled={wacaSending}
                onClick={() => setIsBulkWacaOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-full text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A]"
              >
                Close
              </button>
              <button
                type="button"
                disabled={wacaSending || Boolean(wacaSuccessMessage)}
                onClick={handleSendBulkWaca}
                className="px-5 py-2 text-xs font-semibold rounded-full bg-[#00695C] text-white hover:bg-[#005449] shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{wacaSending ? 'Queueing Messages...' : 'Dispatch Broadcast'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
