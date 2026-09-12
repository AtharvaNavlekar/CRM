import React, { useState, useMemo } from 'react';
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
  Trash2,
  Phone,
  CheckSquare,
  Square,
  X,
  Send,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal
} from 'lucide-react';
import { MockLead, TEAM_MEMBERS, PIPELINE_STAGES } from '../../data/mockSeedData';
import { AvatarBadge } from '../common/AvatarBadge';
import { StatusPill } from '../common/StatusPill';
import { useModalFocusTrap } from '../../utils/useModalFocusTrap';
import { useIsMobile } from '../../utils/useBreakpoint';
import { LeadCardList } from './LeadCardList';
import { MobileFilterSheet } from './MobileFilterSheet';

interface LeadsListViewProps {
  leads: MockLead[];
  onUpdateLead: (updated: MockLead) => void;
  onBulkUpdate: (leadIds: string[], updates: Partial<MockLead>) => void;
  onInitiateCall?: (lead: MockLead) => void;
  onOpenChat?: (lead: MockLead) => void;
}

type SortField = 'name' | 'rating' | 'createdIso' | 'value' | 'status' | 'stage' | 'assignee' | 'source';
type SortOrder = 'asc' | 'desc';

export const LeadsListView: React.FC<LeadsListViewProps> = ({
  leads,
  onUpdateLead,
  onBulkUpdate,
  onInitiateCall,
  onOpenChat
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
  const [sortField, setSortField] = useState<SortField>('createdIso');
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

  // Dynamic available sources from seed leads
  const availableSources = useMemo(() => {
    return Array.from(new Set(leads.map((l) => l.source))).filter(Boolean);
  }, [leads]);

  // Filter & Search Logic
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (searchField === 'name' && !lead.name.toLowerCase().includes(q)) return false;
        if (searchField === 'phone' && !lead.phone.includes(q)) return false;
        if (searchField === 'email' && !lead.email.toLowerCase().includes(q)) return false;
        if (searchField === 'company' && !lead.companyOrProject.toLowerCase().includes(q)) return false;
      }

      // Stage Filter (matches lead.stage or lead.status)
      if (stageFilter !== 'all') {
        const currentStage = lead.stage || lead.status;
        if (currentStage !== stageFilter) return false;
      }

      // Assignee
      if (assigneeFilter !== 'all' && lead.assignee !== assigneeFilter) {
        return false;
      }

      // Source Filter
      if (sourceFilter !== 'all' && lead.source !== sourceFilter) {
        return false;
      }

      // Date
      if (dateFilter === 'today') {
        if (!lead.createdOn.includes('m ago') && !lead.createdOn.includes('h ago')) return false;
      } else if (dateFilter === 'week') {
        if (lead.createdOn.includes('M ago')) return false;
      } else if (dateFilter === 'month') {
        if (lead.createdOn.includes('2M ago')) return false;
      }

      // Compliance / Fatigue Filter
      if (complianceFilter === 'capped') {
        if (lead.fatigueStatus !== 'capped') return false;
      } else if (complianceFilter === 'at_risk') {
        if (lead.fatigueStatus !== 'at_risk') return false;
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
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'stage' || sortField === 'status') {
        aVal = a.stage || a.status;
        bVal = b.stage || b.status;
      }

      if (sortField === 'rating' || sortField === 'value') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
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
  const handleRatingClick = (e: React.MouseEvent, lead: MockLead, star: number) => {
    e.stopPropagation();
    const nextRating = lead.rating === star ? 0 : star;
    onUpdateLead({ ...lead, rating: nextRating });
  };

  // Bulk Edit Execution
  const handleApplyBulkEdit = () => {
    if (selectedIds.size === 0) return;
    const updates: Partial<MockLead> = {};
    if (bulkStatus) updates.status = bulkStatus as any;
    if (bulkAssignee) updates.assignee = bulkAssignee;
    if (bulkRating > 0) updates.rating = bulkRating;

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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF8] dark:bg-[#111413] overflow-hidden">
      {/* Top Toolbar */}
      <div className={`bg-[#F8FAF8] dark:bg-[#111413] border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shrink-0 ${isMobile ? 'p-3 space-y-2.5' : 'p-4 space-y-3.5'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search with Field-Picker - Material Design 3 Pill Bar */}
          <div className={`flex items-center space-x-2 flex-1 ${isMobile ? 'min-w-0' : 'min-w-[280px] max-w-lg'}`}>
            <div className="relative flex-1 flex items-center bg-[#ECEFEC] dark:bg-[#1D201F] rounded-full border border-transparent hover:border-[#BEC9C5] dark:hover:border-[#3F4946] focus-within:border-[#00695C] focus-within:ring-2 focus-within:ring-[#00695C]/20 transition-all min-h-[46px] px-2">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as any)}
                aria-label="Filter search by field"
                className="h-8 pl-2 pr-1 text-xs font-medium border-r border-[#BEC9C5]/60 dark:border-[#3F4946]/60 m3-select"
              >
                <option value="name" className="bg-[#F8FAF8] dark:bg-[#1D201F]">Name</option>
                <option value="phone" className="bg-[#F8FAF8] dark:bg-[#1D201F]">Phone</option>
                <option value="email" className="bg-[#F8FAF8] dark:bg-[#1D201F]">Email</option>
                <option value="company" className="bg-[#F8FAF8] dark:bg-[#1D201F]">Company</option>
              </select>
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

          {/* Right: Primary Action Buttons with M3 Pill Shapes & Min 44-48px Touch Heights */}
          <div className="flex items-center space-x-2.5">
            {/* Bulk Edit Button (M3 Tonal Pill Button) */}
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

            {/* Bulk WACA Message Button (M3 Filled Pill Button) */}
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
              <span>Bulk WACA Message</span>
              {selectedIds.size > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-white text-[#00695C] text-[10px] font-mono font-bold">
                  {selectedIds.size}
                </span>
              )}
            </button>

            {/* More Overflow Menu (M3 Pill Icon Button with 44x44 target) */}
            <div className="relative">
              <button
                type="button"
                id="btn-more-menu"
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="w-11 h-11 flex items-center justify-center rounded-full border border-[#BEC9C5]/50 dark:border-[#3F4946]/50 bg-[#F8FAF8] dark:bg-[#1D201F] text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] transition-colors"
                title="More Actions"
                aria-label="More Actions"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute right-0 top-12 w-52 bg-[#F8FAF8] dark:bg-[#1D201F] border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 rounded-[20px] shadow-xl p-2 z-30 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      alert(`Exported ${filteredLeads.length} leads as CSV!`);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] rounded-full flex items-center space-x-2.5 min-h-[40px]"
                  >
                    <Download className="w-4 h-4 text-[#6F7976]" />
                    <span>Export Leads (CSV)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      alert('Import Wizard opened.');
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] rounded-full flex items-center space-x-2.5 min-h-[40px]"
                  >
                    <Upload className="w-4 h-4 text-[#6F7976]" />
                    <span>Import from Excel/CSV</span>
                  </button>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setSelectedIds(new Set());
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-medium text-[#BA1A1A] hover:bg-[#FFDAD6] dark:hover:bg-[#93000A]/30 rounded-full flex items-center space-x-2.5 min-h-[40px]"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Deselect All ({selectedIds.size})</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: Filter button + sort toggle */}
        {isMobile && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#ECEFEC] dark:bg-[#1D201F] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] min-h-[44px] transition-colors hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A]"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#00695C] text-white text-[10px] font-bold min-w-[20px] text-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <span className="text-[11px] text-[#6F7976] dark:text-[#89938F] font-mono">
              {totalCount} leads
            </span>
          </div>
        )}

        {/* Desktop/Tablet: Material Design 3 Comprehensive Filtering & Sorting Bar */}
        {!isMobile && <div className="space-y-3 pt-2 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 text-xs">
          {/* Row 1: M3 Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-[#6F7976] dark:text-[#89938F] mr-1 text-[11px] font-medium uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
              <span>Filters:</span>
            </div>

            {/* Lead Stage Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <span className="text-[11px] text-[#6F7976] dark:text-[#89938F] mr-2 font-medium">Stage:</span>
              <select
                id="filter-stage"
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium m3-select-bare"
              >
                <option value="all" className="bg-[#F8FAF8] dark:bg-[#1D201F]">All Stages ({PIPELINE_STAGES.length})</option>
                {PIPELINE_STAGES.map((st) => (
                  <option key={st} value={st} className="bg-[#F8FAF8] dark:bg-[#1D201F]">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <span className="text-[11px] text-[#6F7976] dark:text-[#89938F] mr-2 font-medium">Assignee:</span>
              <select
                id="filter-assignee"
                value={assigneeFilter}
                onChange={(e) => {
                  setAssigneeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium m3-select-bare"
              >
                <option value="all" className="bg-[#F8FAF8] dark:bg-[#1D201F]">All Assignees</option>
                {TEAM_MEMBERS.map((m) => (
                  <option key={m.id} value={m.name} className="bg-[#F8FAF8] dark:bg-[#1D201F]">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <span className="text-[11px] text-[#6F7976] dark:text-[#89938F] mr-2 font-medium">Source:</span>
              <select
                id="filter-source"
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium m3-select-bare"
              >
                <option value="all" className="bg-[#F8FAF8] dark:bg-[#1D201F]">All Sources ({availableSources.length})</option>
                {availableSources.map((src) => (
                  <option key={src} value={src} className="bg-[#F8FAF8] dark:bg-[#1D201F]">
                    {src}
                  </option>
                ))}
              </select>
            </div>

            {/* Fatigue & Preference Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <span className="text-[11px] text-[#6F7976] dark:text-[#89938F] mr-2 font-medium">Compliance:</span>
              <select
                id="filter-compliance"
                value={complianceFilter}
                onChange={(e) => {
                  setComplianceFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium m3-select-bare"
              >
                <option value="all" className="bg-[#F8FAF8] dark:bg-[#1D201F]">All Leads</option>
                <option value="capped" className="bg-[#F8FAF8] dark:bg-[#1D201F]">🛑 Capped (3/3 Calls)</option>
                <option value="at_risk" className="bg-[#F8FAF8] dark:bg-[#1D201F]">⚠️ Near Cap (2/3 Calls)</option>
                <option value="whatsapp_only" className="bg-[#F8FAF8] dark:bg-[#1D201F]">💬 WhatsApp Only</option>
                <option value="paused_opted_out" className="bg-[#F8FAF8] dark:bg-[#1D201F]">⏸️ Paused / Opted-out</option>
              </select>
            </div>

            {/* Creation Date Filter Chip */}
            <div className="inline-flex items-center rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] px-3.5 py-1.5 min-h-[38px] transition-colors">
              <span className="text-[11px] text-[#6F7976] dark:text-[#89938F] mr-2 font-medium">Created:</span>
              <select
                id="filter-date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium m3-select-bare"
              >
                <option value="all" className="bg-[#F8FAF8] dark:bg-[#1D201F]">All Time</option>
                <option value="today" className="bg-[#F8FAF8] dark:bg-[#1D201F]">Today (&lt; 24h)</option>
                <option value="week" className="bg-[#F8FAF8] dark:bg-[#1D201F]">Past Week</option>
                <option value="month" className="bg-[#F8FAF8] dark:bg-[#1D201F]">Past Month</option>
              </select>
            </div>

            {/* Active filters reset button */}
            {(stageFilter !== 'all' || assigneeFilter !== 'all' || sourceFilter !== 'all' || complianceFilter !== 'all' || dateFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                id="btn-reset-filters"
                onClick={() => {
                  setStageFilter('all');
                  setAssigneeFilter('all');
                  setSourceFilter('all');
                  setComplianceFilter('all');
                  setDateFilter('all');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-xs font-medium text-[#00695C] dark:text-[#80D5C4] hover:underline flex items-center space-x-1 ml-auto min-h-[36px] px-2.5 rounded-full hover:bg-[#CCE8E1]/40"
              >
                <span>Reset All Filters</span>
              </button>
            )}
          </div>

          {/* Row 2: Material Design 3 Segmented Button for Sorting */}
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
                  { id: 'createdIso' as SortField, label: 'Recent' }
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

            <div className="text-xs text-[#6F7976] dark:text-[#89938F] font-mono">
              Showing {currentLeads.length} of {filteredLeads.length} leads
            </div>
          </div>
        </div>}
      </div>

      {/* Mobile: Card list view */}
      {isMobile ? (
        <div className="flex-1 overflow-auto bg-[#F8FAF8] dark:bg-[#111413]">
          <LeadCardList
            leads={currentLeads}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleRow}
            onUpdateLead={onUpdateLead}
            onInitiateCall={onInitiateCall}
            onOpenChat={onOpenChat}
          />
        </div>
      ) : (
      /* Desktop/Tablet: Leads Table Container */
      <div className="flex-1 overflow-auto bg-[#F8FAF8] dark:bg-[#111413] select-none">
        <table className="w-full text-left border-collapse">
          {/* Table Header - M3 Surface Container */}
          <thead className="sticky top-0 z-20 bg-[#ECEFEC]/95 dark:bg-[#1D201F]/95 backdrop-blur-md text-[11px] font-medium text-[#3F4946] dark:text-[#BEC9C5] uppercase tracking-wider border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40">
            <tr>
              {/* Checkbox column */}
              <th className="w-12 px-3 py-3 text-center">
                <button
                  type="button"
                  onClick={handleSelectAllOnPage}
                  className="w-10 h-10 rounded-full inline-flex items-center justify-center text-[#6F7976] hover:text-[#191C1B] dark:hover:text-white hover:bg-[#DAE5E1] dark:hover:bg-[#3F4946] transition-colors"
                  title="Select All on page"
                  aria-label="Select All on page"
                >
                  {isAllCurrentSelected ? (
                    <CheckSquare className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                </button>
              </th>

              {/* Name Column */}
              {visibleColumns.name && (
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[200px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="m3-label-medium">Name &amp; Contact</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                    )}
                  </div>
                </th>
              )}

              {/* Status / Stage Column (sortable) */}
              {visibleColumns.status && (
                <th
                  onClick={() => handleSort('stage')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[150px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="m3-label-medium">Lead Stage</span>
                    {(sortField === 'stage' || sortField === 'status') ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                    )}
                  </div>
                </th>
              )}

              {/* Rating Column (sortable) */}
              {visibleColumns.rating && (
                <th
                  onClick={() => handleSort('rating')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[120px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="m3-label-medium">Rating</span>
                    {sortField === 'rating' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                    )}
                  </div>
                </th>
              )}

              {/* Assignee Column (sortable) */}
              {visibleColumns.assignee && (
                <th
                  onClick={() => handleSort('assignee')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[160px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="m3-label-medium">Assignee</span>
                    {sortField === 'assignee' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                    )}
                  </div>
                </th>
              )}

              {/* Source Column (sortable) */}
              {visibleColumns.source && (
                <th
                  onClick={() => handleSort('source')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[130px]"
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

              {/* Created On Column (sortable) */}
              {visibleColumns.createdOn && (
                <th
                  onClick={() => handleSort('createdIso')}
                  className="px-4 py-3.5 cursor-pointer hover:text-[#191C1B] dark:hover:text-white transition-colors min-w-[130px]"
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="m3-label-medium">Created</span>
                    {sortField === 'createdIso' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#6F7976] opacity-60" />
                    )}
                  </div>
                </th>
              )}

              {/* Optional: Phone */}
              {visibleColumns.phone && (
                <th className="px-4 py-3.5 min-w-[130px] m3-label-medium">Phone</th>
              )}

              {/* Optional: Company */}
              {visibleColumns.company && (
                <th className="px-4 py-3.5 min-w-[160px] m3-label-medium">Project / Company</th>
              )}

              {/* Optional: Value */}
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

              {/* Actions */}
              <th className="w-28 px-4 py-3.5 text-right m3-label-medium">Quick Dial</th>
            </tr>
          </thead>

          {/* Table Body with Breathable M3 Spacing */}
          <tbody className="divide-y divide-[#BEC9C5]/30 dark:divide-[#3F4946]/30 text-xs">
            {currentLeads.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-[#6F7976]">
                  <p className="font-medium text-sm">No leads match your current search or filters.</p>
                  <p className="text-xs mt-1">Try clearing filter chips or searching by phone/email.</p>
                </td>
              </tr>
            ) : (
              currentLeads.map((lead) => {
                const isSelected = selectedIds.has(lead.id);

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
                    {/* Checkbox with accessible touch target */}
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
                            {lead.phone} • {lead.companyOrProject}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Status as colored pill with compliance/fatigue indicators */}
                    {visibleColumns.status && (
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col space-y-1 items-start">
                          <StatusPill status={lead.stage || lead.status} />
                          {lead.fatigueStatus === 'capped' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FFDAD6] text-[#410002]">
                              🛑 Capped (3/3)
                            </span>
                          )}
                          {lead.fatigueStatus === 'at_risk' && (
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

                    {/* Rating (editable inline star icon, independent of status) */}
                    {visibleColumns.rating && (
                      <td className="px-4 py-3.5">
                        <div
                          className="flex items-center space-x-1"
                          title={`Rating: ${lead.rating}/5 stars. Click to toggle.`}
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
                                  star <= lead.rating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-[#BEC9C5] dark:text-[#6F7976]'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </td>
                    )}

                    {/* Assignee (colored avatar + name) */}
                    {visibleColumns.assignee && (
                      <td className="px-4 py-3.5">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <AvatarBadge name={lead.assignee} size="sm" />
                          <span className="text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] truncate">
                            {lead.assignee}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Source */}
                    {visibleColumns.source && (
                      <td className="px-4 py-3.5 text-[#3F4946] dark:text-[#BEC9C5] text-xs font-medium">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#ECEFEC] dark:bg-[#1D201F] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40">
                          {lead.source}
                        </span>
                      </td>
                    )}

                    {/* Created On (relative time e.g. "2M ago") */}
                    {visibleColumns.createdOn && (
                      <td className="px-4 py-3.5 text-[#6F7976] font-mono text-xs whitespace-nowrap">
                        <span title={new Date(lead.createdIso).toLocaleString()}>{lead.createdOn}</span>
                      </td>
                    )}

                    {/* Optional columns */}
                    {visibleColumns.phone && (
                      <td className="px-4 py-3.5 font-mono text-xs text-[#3F4946] dark:text-[#BEC9C5]">
                        {lead.phone}
                      </td>
                    )}

                    {visibleColumns.company && (
                      <td className="px-4 py-3.5 text-[#191C1B] dark:text-[#E1E3E0] truncate max-w-[180px]">
                        {lead.companyOrProject}
                      </td>
                    )}

                    {visibleColumns.value && (
                      <td className="px-4 py-3.5 font-mono text-[#191C1B] dark:text-[#E1E3E0] font-medium">
                        ₹ {lead.value >= 100000 ? `${(lead.value / 100000).toFixed(1)} L` : lead.value.toLocaleString('en-IN')}
                      </td>
                    )}

                    {/* Quick Dial / WhatsApp Action Buttons with 44x44dp Touch Targets */}
                    <td
                      className="px-4 py-3.5 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const isCallBlocked = lead.fatigueStatus === 'capped' || lead.preferences?.preferredChannel === 'WhatsApp' || lead.preferences?.isOptedOut;
                        const blockReason = lead.fatigueStatus === 'capped'
                          ? 'Blocked: 3/3 weekly fatigue cap reached'
                          : lead.preferences?.preferredChannel === 'WhatsApp'
                          ? 'Disabled: Consumer requested WhatsApp Only'
                          : lead.preferences?.isOptedOut
                          ? 'Blocked: Lead opted out'
                          : '';

                        return (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              disabled={isCallBlocked}
                              onClick={() => onInitiateCall && onInitiateCall(lead)}
                              aria-label={`Dial ${lead.name}`}
                              className={`w-10 h-10 rounded-full inline-flex items-center justify-center transition-colors ${
                                isCallBlocked
                                  ? 'opacity-30 cursor-not-allowed text-[#6F7976]'
                                  : 'hover:bg-[#CCE8E1] dark:hover:bg-[#004F46] text-[#00695C] dark:text-[#80D5C4]'
                              }`}
                              title={isCallBlocked ? blockReason : `Dial ${lead.name}`}
                            >
                              <Phone className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenChat && onOpenChat(lead)}
                              aria-label={`WhatsApp message to ${lead.name}`}
                              className={`w-10 h-10 rounded-full inline-flex items-center justify-center transition-colors ${
                                lead.preferences?.preferredChannel === 'WhatsApp'
                                  ? 'bg-[#25D366] text-white hover:bg-[#1EBE5D] shadow-xs'
                                  : 'hover:bg-[#CCE8E1] dark:hover:bg-[#004F46] text-[#00695C] dark:text-[#80D5C4]'
                              }`}
                              title={`WhatsApp Cloud message to ${lead.name}${lead.preferences?.preferredChannel === 'WhatsApp' ? ' (Preferred Channel)' : ''}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>)}

      {/* Table Footer: Column Dropdown & Pagination ("1–20 of [N]" format) */}
      <div className={`bg-[#F8FAF8] dark:bg-[#111413] border-t border-[#BEC9C5]/40 dark:border-[#3F4946]/40 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${isMobile ? 'p-3 pb-24' : 'p-3.5'}`}>
        {/* Left: Column Configuration Dropdown */}
        <div className="relative">
          <button
            type="button"
            id="btn-column-config"
            onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
            className="flex items-center space-x-2 px-4 py-2 rounded-full border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E0E4E0] text-[#191C1B] dark:text-[#E1E3E0] font-medium min-h-[40px]"
          >
            <Columns className="w-4 h-4 text-[#6F7976]" />
            <span>Columns</span>
          </button>

          {isColumnDropdownOpen && (
            <div className="absolute bottom-12 left-0 w-56 bg-[#F8FAF8] dark:bg-[#1D201F] border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 rounded-[20px] shadow-xl p-3 z-30 space-y-1.5">
              <div className="text-[11px] font-medium uppercase tracking-wider text-[#6F7976] px-2 py-1">
                Visible Columns
              </div>
              {Object.entries(visibleColumns).map(([colKey, isVisible]) => (
                <label
                  key={colKey}
                  className="flex items-center justify-between px-2.5 py-2 text-xs rounded-xl hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] cursor-pointer"
                >
                  <span className="capitalize text-[#191C1B] dark:text-[#E1E3E0]">
                    {colKey === 'createdOn' ? 'Created On' : colKey}
                  </span>
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) =>
                      setVisibleColumns({
                        ...visibleColumns,
                        [colKey]: e.target.checked
                      })
                    }
                    className="w-4 h-4 rounded text-[#00695C] border-[#BEC9C5] focus:ring-[#00695C]"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Center: Selected summary if any */}
        <div className="text-xs text-[#6F7976]">
          {selectedIds.size > 0 ? (
            <span className="font-medium text-[#00695C] dark:text-[#80D5C4]">
              {selectedIds.size} of {totalCount} lead(s) selected
            </span>
          ) : (
            <span>Showing filtered pool ({totalCount} total)</span>
          )}
        </div>

        {/* Right: Exact "1–20 of [N]" Pagination Format */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono font-medium text-[#191C1B] dark:text-[#E1E3E0]">
            {totalCount === 0 ? '0 of 0' : `${startIndex + 1}–${endIndex} of ${totalCount}`}
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="w-10 h-10 rounded-full border border-[#BEC9C5]/50 dark:border-[#3F4946]/50 disabled:opacity-30 hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F] text-[#191C1B] dark:text-[#E1E3E0] inline-flex items-center justify-center transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="w-10 h-10 rounded-full border border-[#BEC9C5]/50 dark:border-[#3F4946]/50 disabled:opacity-30 hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F] text-[#191C1B] dark:text-[#E1E3E0] inline-flex items-center justify-center transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Material Design 3 Bulk Edit Dialog */}
      {isBulkEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            ref={bulkEditTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-modal-title"
            tabIndex={-1}
            className="w-full max-w-md bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[28px] border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 focus:outline-none"
          >
            <div className="p-5 bg-[#ECEFEC] dark:bg-[#272B2A] border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Edit3 className="w-5 h-5 text-[#00695C] dark:text-[#80D5C4]" />
                <h3 id="bulk-edit-modal-title" className="text-base font-medium text-[#191C1B] dark:text-[#E1E3E0] m3-title-medium">
                  Bulk Edit ({selectedIds.size} Leads)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkEditOpen(false)}
                aria-label="Close dialog"
                className="text-[#6F7976] hover:text-[#191C1B] dark:hover:text-white p-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label htmlFor="bulk-stage-select-input" className="block font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-1.5">
                  Change Pipeline Stage
                </label>
                <select
                  id="bulk-stage-select-input"
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="w-full p-3 font-medium focus-visible:outline-none focus-visible:ring-2 m3-select"
                >
                  <option value="">-- Leave unchanged --</option>
                  {PIPELINE_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="bulk-assignee-select-input" className="block font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-1.5">
                  Reassign to Teammate
                </label>
                <select
                  id="bulk-assignee-select-input"
                  value={bulkAssignee}
                  onChange={(e) => setBulkAssignee(e.target.value)}
                  className="w-full p-3 font-medium focus-visible:outline-none focus-visible:ring-2 m3-select"
                >
                  <option value="">-- Leave unchanged --</option>
                  {TEAM_MEMBERS.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-1.5">
                  Update Star Rating
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setBulkRating(bulkRating === s ? 0 : s)}
                      aria-label={`Set rating to ${s} star${s > 1 ? 's' : ''}`}
                      className="p-1.5 hover:scale-110 transition-transform rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          s <= bulkRating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-[#BEC9C5] dark:text-[#6F7976]'
                        }`}
                      />
                    </button>
                  ))}
                  {bulkRating > 0 && (
                    <span className="text-[#6F7976] ml-2 text-xs font-medium">Set to {bulkRating} stars</span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#ECEFEC] dark:bg-[#272B2A] border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={() => setIsBulkEditOpen(false)}
                className="px-5 py-2.5 text-xs font-medium rounded-full border border-[#BEC9C5] dark:border-[#3F4946] hover:bg-[#E0E4E0] text-[#191C1B] dark:text-[#E1E3E0] min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyBulkEdit}
                className="px-5 py-2.5 text-xs font-medium rounded-full bg-[#00695C] text-white hover:bg-[#005449] min-h-[44px] shadow-sm"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Design 3 Bulk WACA Message Dialog */}
      {isBulkWacaOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            ref={bulkWacaTrapRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-waca-modal-title"
            tabIndex={-1}
            className="w-full max-w-lg bg-[#F8FAF8] dark:bg-[#1D201F] rounded-[28px] border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 focus:outline-none"
          >
            <div className="p-5 bg-[#00695C] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <MessageSquare className="w-5 h-5 text-[#80D5C4]" />
                <h3 id="bulk-waca-modal-title" className="text-base font-medium m3-title-medium">
                  Bulk WhatsApp Cloud API (WACA) Dispatch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkWacaOpen(false)}
                aria-label="Close dialog"
                className="text-white/80 hover:text-white p-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#CCE8E1] dark:bg-[#004F46] border border-[#80D5C4]/40 flex items-center space-x-3">
                <Sparkles className="w-5 h-5 text-[#00201B] dark:text-[#A3F2E4] shrink-0" />
                <div>
                  <p className="font-medium text-[#00201B] dark:text-[#A3F2E4]">
                    Official Meta WACA Business Sender Ready
                  </p>
                  <p className="text-xs text-[#05201A] dark:text-[#CCE8E0] mt-0.5">
                    Broadcasting to {selectedIds.size} verified phone numbers with personalized variables.
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="waca-template-select-input" className="block font-medium text-[#191C1B] dark:text-[#E1E3E0] mb-1.5">
                  Select Pre-Approved HSM Template
                </label>
                <select
                  id="waca-template-select-input"
                  value={wacaTemplate}
                  onChange={(e) => setWacaTemplate(e.target.value)}
                  className="w-full p-3 font-medium focus-visible:outline-none focus-visible:ring-2 m3-select"
                >
                  <option value="welcome_intro">welcome_telesales_intro (Utility)</option>
                  <option value="demo_invitation">demo_webinar_invitation (Marketing)</option>
                  <option value="quote_followup">quotation_shared_followup (Service)</option>
                  <option value="callback_reminder">scheduled_callback_alert (Alert)</option>
                </select>
              </div>

              {/* Template Preview */}
              <div className="p-4 rounded-2xl bg-[#ECEFEC] dark:bg-[#272B2A] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#6F7976]">
                  Message Body Preview
                </span>
                <p className="mt-2 text-xs text-[#191C1B] dark:text-[#E1E3E0] whitespace-pre-line leading-relaxed">
                  {wacaTemplate === 'welcome_intro' &&
                    `Hello {{lead_name}},\nThank you for expressing interest in {{project_name}}. I am {{rep_name}} from the sales advisory team. Would you be available for a brief 3-minute discussion today?`}
                  {wacaTemplate === 'demo_invitation' &&
                    `Hi {{lead_name}},\nYour private walkthrough session for {{project_name}} has been arranged. Please tap below to confirm your preferred slot.`}
                  {wacaTemplate === 'quote_followup' &&
                    `Dear {{lead_name}},\nWe have generated the official quotation with special launch pricing. Please check your email or reply to review terms.`}
                  {wacaTemplate === 'callback_reminder' &&
                    `Hello {{lead_name}},\nThis is a quick reminder regarding our scheduled advisory call in 15 minutes. See you soon!`}
                </p>
              </div>

              {wacaSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-[#CCE8E1] text-[#00201B] border border-[#80D5C4] font-medium flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-[#00695C]" />
                  <span>{wacaSuccessMessage}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#ECEFEC] dark:bg-[#272B2A] border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 flex justify-end space-x-2.5">
              <button
                type="button"
                disabled={wacaSending}
                onClick={() => setIsBulkWacaOpen(false)}
                className="px-5 py-2.5 text-xs font-medium rounded-full border border-[#BEC9C5] dark:border-[#3F4946] hover:bg-[#E0E4E0] text-[#191C1B] dark:text-[#E1E3E0] min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={wacaSending}
                onClick={handleSendBulkWaca}
                className="px-5 py-2.5 text-xs font-medium rounded-full bg-[#00695C] text-white hover:bg-[#005449] flex items-center space-x-2 shadow-sm min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                <span>{wacaSending ? 'Queueing Messages...' : `Send to ${selectedIds.size} Leads`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filter Bottom Sheet */}
      <MobileFilterSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        stageFilter={stageFilter}
        assigneeFilter={assigneeFilter}
        sourceFilter={sourceFilter}
        complianceFilter={complianceFilter}
        dateFilter={dateFilter}
        availableSources={availableSources}
        onStageChange={(val) => { setStageFilter(val); setCurrentPage(1); }}
        onAssigneeChange={(val) => { setAssigneeFilter(val); setCurrentPage(1); }}
        onSourceChange={(val) => { setSourceFilter(val); setCurrentPage(1); }}
        onComplianceChange={(val) => { setComplianceFilter(val as any); setCurrentPage(1); }}
        onDateChange={(val) => { setDateFilter(val); setCurrentPage(1); }}
        onResetAll={handleResetAllFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
};
