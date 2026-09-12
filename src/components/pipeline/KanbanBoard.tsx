import React, { useState, useEffect } from 'react';
import {
  Kanban,
  Filter,
  Plus,
  Upload,
  User,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  CheckSquare,
  Square,
  Users,
  Zap,
  RefreshCw
} from 'lucide-react';
import { Lead, LeadStage, LeadSource, User as UserType } from '../../types';
import { LeadCard } from './LeadCard';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

interface KanbanBoardProps {
  leads: Lead[];
  users?: UserType[];
  onOpenDetail?: (lead: Lead) => void;
  onSelectLead?: (lead: Lead) => void;
  onStartCall: (lead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onUpdateStage: (leadId: string, newStage: LeadStage) => void;
  onAssignRep?: (leadId: string, repId: string) => void;
  onOpenAddLead?: () => void;
  onOpenBulkImport?: () => void;
  onBulkUpdate?: (leadIds: string[], updates: { stage?: LeadStage; assignedRepId?: string }) => Promise<void> | void;
  selectedSource?: string;
  setSelectedSource?: (s: string) => void;
  selectedRep?: string;
  setSelectedRep?: (r: string) => void;
}

const STAGES: { id: LeadStage; title: string; color: string; border: string; dotBg: string }[] = [
  { id: 'New', title: 'New Leads', color: 'text-sky-700 dark:text-sky-300', border: 'border-sky-400', dotBg: 'bg-sky-500' },
  { id: 'Contacted', title: 'Contacted', color: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-400', dotBg: 'bg-indigo-500' },
  { id: 'Follow-up', title: 'Follow-up Due', color: 'text-amber-700 dark:text-amber-300', border: 'border-amber-400', dotBg: 'bg-amber-500' },
  { id: 'Negotiation', title: 'Negotiation', color: 'text-purple-700 dark:text-purple-300', border: 'border-purple-400', dotBg: 'bg-purple-500' },
  { id: 'Won', title: 'Won Closed', color: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-500', dotBg: 'bg-emerald-500' },
  { id: 'Lost', title: 'Lost / Dropped', color: 'text-rose-700 dark:text-rose-300', border: 'border-rose-400', dotBg: 'bg-rose-500' }
];

const SOURCES: LeadSource[] = ['Website', 'WhatsApp', 'Facebook', 'Google Ads', 'IndiaMART', 'Manual'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  users = [],
  onOpenDetail,
  onSelectLead,
  onStartCall,
  onOpenWhatsApp,
  onUpdateStage,
  onAssignRep = () => {},
  onOpenAddLead,
  onOpenBulkImport,
  onBulkUpdate,
  selectedSource,
  setSelectedSource,
  selectedRep,
  setSelectedRep
}) => {
  const { currentUser, users: authUsers } = useAuth();
  const effectiveUsers = users && users.length > 0 ? users : authUsers;
  const handleOpenDetail = onOpenDetail || onSelectLead || (() => {});

  const [internalSource, setInternalSource] = useState('all');
  const [internalRep, setInternalRep] = useState('all');
  const currentSource = selectedSource !== undefined ? selectedSource : internalSource;
  const currentRep = selectedRep !== undefined ? selectedRep : internalRep;
  const handleSourceChange = setSelectedSource || setInternalSource;
  const handleRepChange = setSelectedRep || setInternalRep;

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  // Bulk Edit State
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [bulkStage, setBulkStage] = useState<LeadStage | ''>('');
  const [bulkRepId, setBulkRepId] = useState<string>('');
  const [isApplyingBulk, setIsApplyingBulk] = useState<boolean>(false);
  const [autoAssignmentEnabled, setAutoAssignmentEnabled] = useState<boolean>(true);
  const [isTogglingAutoAssign, setIsTogglingAutoAssign] = useState<boolean>(false);

  // Load auto-assignment status
  useEffect(() => {
    api.getSettings()
      .then((s) => {
        if (s && s.autoAssignmentEnabled !== undefined) {
          setAutoAssignmentEnabled(s.autoAssignmentEnabled);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleAutoAssign = async () => {
    setIsTogglingAutoAssign(true);
    try {
      const nextVal = !autoAssignmentEnabled;
      await api.toggleAutoAssignment(nextVal);
      setAutoAssignmentEnabled(nextVal);
    } catch (err) {
      console.error('Failed to toggle auto assignment:', err);
    } finally {
      setIsTogglingAutoAssign(false);
    }
  };

  const handleToggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedLeadIds.size === filteredLeads.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads.map((l) => l.id)));
    }
  };

  const handleExecuteBulkUpdate = async () => {
    if (selectedLeadIds.size === 0 || (!bulkStage && !bulkRepId)) return;
    setIsApplyingBulk(true);
    try {
      const ids: string[] = Array.from(selectedLeadIds);
      const updates: { stage?: LeadStage; assignedRepId?: string } = {};
      if (bulkStage) updates.stage = bulkStage;
      if (bulkRepId) updates.assignedRepId = bulkRepId;

      if (onBulkUpdate) {
        await onBulkUpdate(ids, updates);
      } else {
        await api.bulkUpdateLeads(ids, updates);
      }

      // Clear selection
      setSelectedLeadIds(new Set());
      setBulkStage('');
      setBulkRepId('');
      setIsBulkMode(false);
    } catch (err) {
      console.error('Failed to apply bulk update:', err);
    } finally {
      setIsApplyingBulk(false);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent, stage: LeadStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e: React.DragEvent, targetStage: LeadStage) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      onUpdateStage(leadId, targetStage);
    }
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    if (currentSource !== 'all' && lead.source !== currentSource) return false;
    if (currentRep !== 'all' && lead.assignedRepId !== currentRep) return false;
    return true;
  });

  // Group filtered leads by stage
  const getStageLeads = (stage: LeadStage) => {
    return filteredLeads.filter((lead) => lead.stage === stage);
  };

  const totalFilteredValue = filteredLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F8FAF8] dark:bg-[#1D201F] p-3.5 sm:p-4 rounded-[24px] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Source Filter */}
          <div className="flex items-center space-x-2 bg-[#ECEFEC] dark:bg-[#272B2A] px-3.5 py-1.5 rounded-full border border-transparent">
            <Filter className="w-3.5 h-3.5 text-[#6F7976]" />
            <span className="text-xs text-[#6F7976] font-medium">Source:</span>
            <select
              id="filter-source-select"
              value={currentSource}
              aria-label="Filter pipeline leads by acquisition source"
              onChange={(e) => handleSourceChange(e.target.value)}
              className="text-xs font-medium m3-select-bare"
            >
              <option value="all">All Channels ({leads.length})</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Rep Filter */}
          <div className="flex items-center space-x-2 bg-[#ECEFEC] dark:bg-[#272B2A] px-3.5 py-1.5 rounded-full border border-transparent">
            <User className="w-3.5 h-3.5 text-[#6F7976]" />
            <span className="text-xs text-[#6F7976] font-medium">Rep:</span>
            <select
              id="filter-rep-select"
              value={currentRep}
              aria-label="Filter pipeline leads by assigned sales representative"
              onChange={(e) => handleRepChange(e.target.value)}
              className="text-xs font-medium m3-select-bare"
            >
              <option value="all">All Team Reps</option>
              {effectiveUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Rep Status Badge */}
          {currentUser?.role === 'telecaller' && (
            <div className="text-xs font-medium text-[#00201B] dark:text-[#80D5C4] bg-[#CCE8E1] dark:bg-[#004F46] px-3 py-1.5 rounded-full flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00695C] dark:bg-[#80D5C4]" aria-hidden="true"></span>
              <span>{currentRep === currentUser.id ? 'My Assigned Leads' : 'Viewing All'}</span>
            </div>
          )}

          {/* Auto-Assignment Round Robin Toggle */}
          <button
            id="btn-toggle-auto-assign"
            type="button"
            onClick={handleToggleAutoAssign}
            disabled={isTogglingAutoAssign}
            aria-label={`Toggle auto-assignment round-robin. Current status: ${autoAssignmentEnabled ? 'Enabled' : 'Disabled'}`}
            aria-pressed={autoAssignmentEnabled}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-all min-h-[36px] ${
              autoAssignmentEnabled
                ? 'bg-[#CCE8E1] text-[#00201B] dark:bg-[#004F46] dark:text-[#80D5C4]'
                : 'bg-[#ECEFEC] dark:bg-[#272B2A] text-[#6F7976]'
            }`}
            title="When active, new leads from WhatsApp, Web, and IndiaMART are evenly distributed to sales reps via round-robin"
          >
            <Zap className={`w-3.5 h-3.5 ${autoAssignmentEnabled ? 'text-amber-500 fill-amber-500' : 'text-[#6F7976]'}`} />
            <span>Auto-Assign: {autoAssignmentEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* Bulk Select Mode Toggle */}
          <button
            id="btn-toggle-bulk-mode"
            type="button"
            onClick={() => {
              const nextMode = !isBulkMode;
              setIsBulkMode(nextMode);
              if (!nextMode) setSelectedLeadIds(new Set());
            }}
            aria-label={isBulkMode ? 'Exit bulk edit selection mode' : 'Enter bulk edit selection mode'}
            aria-pressed={isBulkMode}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-all min-h-[36px] ${
              isBulkMode || selectedLeadIds.size > 0
                ? 'bg-[#00695C] text-white shadow-xs'
                : 'bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0] hover:bg-[#BEC9C5]/40'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{isBulkMode ? 'Exit Selection' : 'Bulk Edit'}</span>
          </button>
        </div>

        {/* Total stats pill */}
        <div className="flex items-center space-x-3 text-xs font-medium text-[#6F7976]">
          <div className="flex items-center space-x-2 bg-[#ECEFEC] dark:bg-[#272B2A] px-3.5 py-1.5 rounded-full">
            <Layers className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
            <span className="text-[#6F7976]">
              Pipeline: <strong className="text-[#191C1B] dark:text-[#E1E3E0] font-semibold">{filteredLeads.length}</strong>
            </span>
            <span className="text-[#BEC9C5] dark:text-[#3F4946]">•</span>
            <span className="font-semibold text-[#00695C] dark:text-[#80D5C4]">
              {formatCurrency(totalFilteredValue)}
            </span>
          </div>

          {(onOpenAddLead || onOpenBulkImport) && (
            <div className="hidden lg:flex items-center space-x-2">
              {onOpenBulkImport && (
                <button
                  onClick={onOpenBulkImport}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] bg-[#ECEFEC] dark:bg-[#272B2A] hover:bg-[#BEC9C5]/40 transition-colors flex items-center space-x-1.5 min-h-[36px]"
                >
                  <Upload className="w-3.5 h-3.5 text-[#6F7976]" />
                  <span>Import</span>
                </button>
              )}
              {onOpenAddLead && (
                <button
                  onClick={onOpenAddLead}
                  className="px-4 py-1.5 rounded-full text-xs font-medium text-white bg-[#00695C] hover:bg-[#005449] transition-colors flex items-center space-x-1.5 shadow-xs min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Lead</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3 min-w-[1200px] h-full items-start">
          {STAGES.map((stage) => {
            const stageLeads = getStageLeads(stage.id);
            const stageValue = stageLeads.reduce((acc, curr) => acc + (curr.value || 0), 0);
            const isTarget = dragOverStage === stage.id;

            return (
              <div
                key={stage.id}
                id={`kanban-column-${stage.id.toLowerCase().replace(' ', '-')}`}
                role="region"
                aria-label={`${stage.title} column, ${stageLeads.length} leads`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
                className={`flex flex-col bg-[#ECEFEC]/60 dark:bg-[#1D201F] rounded-[24px] border transition-all duration-200 p-3 min-h-[520px] max-h-[calc(100vh-210px)] ${
                  isTarget
                    ? 'border-[#00695C] ring-2 ring-[#00695C]/20 bg-[#CCE8E1]/30 dark:bg-[#004F46]/20'
                    : 'border-[#BEC9C5]/40 dark:border-[#3F4946]/40'
                }`}
              >
                {/* Stage Header */}
                <div className="flex items-center justify-between px-1.5 py-1 mb-2 border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dotBg}`} aria-hidden="true" />
                    <h3 className="font-semibold text-xs text-[#191C1B] dark:text-[#E1E3E0] m3-title-small truncate">
                      {stage.title}
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#F8FAF8] dark:bg-[#272B2A] border border-[#BEC9C5]/40 dark:border-[#3F4946]/40 text-[#191C1B] dark:text-[#E1E3E0] tabular-nums">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Deal Value Subtitle */}
                {stageValue > 0 && (
                  <div className="px-1.5 pb-2 text-[11px] text-[#6F7976] font-normal">
                    Total: <span className="font-semibold text-[#191C1B] dark:text-[#E1E3E0] tabular-nums font-mono">{formatCurrency(stageValue)}</span>
                  </div>
                )}

                {/* Cards Container */}
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      users={effectiveUsers}
                      onOpenDetail={handleOpenDetail}
                      onStartCall={onStartCall}
                      onOpenWhatsApp={onOpenWhatsApp}
                      onUpdateStage={onUpdateStage}
                      onAssignRep={onAssignRep}
                      onDragStart={handleDragStart}
                      isSelected={selectedLeadIds.has(lead.id)}
                      onToggleSelect={handleToggleSelectLead}
                      isSelectMode={isBulkMode || selectedLeadIds.size > 0}
                    />
                  ))}

                  {stageLeads.length === 0 && (
                    <div className="h-32 border border-dashed border-[#BEC9C5]/60 dark:border-[#3F4946]/60 rounded-[18px] flex flex-col items-center justify-center p-3 text-center text-[#6F7976] group/empty hover:border-[#00695C]/50 transition-colors">
                      <p className="text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0]">No leads in stage</p>
                      <p className="text-[10px] text-[#6F7976] mt-0.5">Drop card here to update stage</p>
                      {onOpenAddLead && (
                        <button
                          type="button"
                          onClick={onOpenAddLead}
                          aria-label={`Add lead to ${stage.title}`}
                          className="mt-2 text-xs font-medium text-[#00695C] dark:text-[#80D5C4] hover:underline inline-flex items-center space-x-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00695C] rounded px-1 min-h-[32px]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Lead</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {(selectedLeadIds.size > 0 || isBulkMode) && (
        <div
          id="bulk-edit-bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#00201B] dark:bg-[#1D201F] text-white px-5 py-3 rounded-full shadow-2xl border border-[#004F46] dark:border-[#3F4946] flex flex-wrap items-center gap-3 max-w-[95vw] sm:max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Select all toggle */}
          <button
            id="btn-bulk-select-all"
            type="button"
            onClick={handleSelectAllFiltered}
            aria-label={selectedLeadIds.size === filteredLeads.length ? 'Deselect all filtered leads' : `Select all ${filteredLeads.length} filtered leads`}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80D5C4]"
          >
            {selectedLeadIds.size === filteredLeads.length && filteredLeads.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-[#80D5C4]" />
            ) : (
              <Square className="w-4 h-4 text-slate-300" />
            )}
            <span>{selectedLeadIds.size === filteredLeads.length ? 'Deselect All' : `Select All (${filteredLeads.length})`}</span>
          </button>

          {/* Selected count badge */}
          <div className="text-xs font-medium px-3 py-1 rounded-full bg-[#004F46] text-[#80D5C4] tabular-nums font-mono">
            {selectedLeadIds.size} Selected
          </div>

          <div className="h-4 w-px bg-white/20 hidden sm:block"></div>

          {/* Stage selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-[#A2ADA9] font-medium">Stage:</span>
            <select
              id="bulk-stage-select"
              value={bulkStage}
              aria-label="Bulk update stage for selected leads"
              onChange={(e) => setBulkStage(e.target.value as LeadStage)}
              className="text-xs font-medium bg-black/40 text-white border-white/20 rounded-full px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-[#80D5C4] m3-select-bare"
            >
              <option value="">Keep unchanged</option>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Rep selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-[#A2ADA9] font-medium">Assign:</span>
            <select
              id="bulk-rep-select"
              value={bulkRepId}
              aria-label="Bulk assign sales rep for selected leads"
              onChange={(e) => setBulkRepId(e.target.value)}
              className="text-xs font-medium bg-black/40 text-white border-white/20 rounded-full px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-[#80D5C4] max-w-[140px] truncate m3-select-bare"
            >
              <option value="">Keep unchanged</option>
              {effectiveUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Apply button */}
          <button
            id="btn-apply-bulk-edit"
            type="button"
            onClick={handleExecuteBulkUpdate}
            disabled={selectedLeadIds.size === 0 || (!bulkStage && !bulkRepId) || isApplyingBulk}
            aria-label={`Apply bulk changes to ${selectedLeadIds.size} selected leads`}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#00695C] hover:bg-[#005449] disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white transition-all shadow-sm active:scale-95 ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80D5C4]"
          >
            {isApplyingBulk ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#80D5C4]" />
            )}
            <span>Apply to {selectedLeadIds.size}</span>
          </button>

          {/* Clear button */}
          <button
            id="btn-cancel-bulk-edit"
            type="button"
            onClick={() => {
              setSelectedLeadIds(new Set());
              setIsBulkMode(false);
              setBulkStage('');
              setBulkRepId('');
            }}
            aria-label="Cancel bulk edit selection"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#A2ADA9] hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#80D5C4]"
            title="Cancel selection"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

