import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { BottomNavBar } from './components/layout/BottomNavBar';
import { LeadsListView } from './components/leads/LeadsListView';
import { DashboardView } from './components/dashboard/DashboardView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { GettingStartedView } from './components/home/GettingStartedView';
import { KanbanBoard } from './components/pipeline/KanbanBoard';
import { AddLeadModal } from './components/pipeline/AddLeadModal';
import { BulkImportModal } from './components/pipeline/BulkImportModal';
import { LeadDetailModal } from './components/pipeline/LeadDetailModal';
import { CallConsoleModal } from './components/calling/CallConsoleModal';
import { CallsView } from './components/calling/CallsView';
import { WhatsAppView } from './components/whatsapp/WhatsAppView';
import { SupportView } from './components/support/SupportView';
import { SettingsView } from './components/settings/SettingsView';
import { TrustComplianceView } from './components/compliance/TrustComplianceView';
import { LoginModal } from './components/auth/LoginModal';
import { Plus, PhoneCall } from 'lucide-react';
import { Lead, Call, LeadStage, CallOutcome } from './types';
import { useAuth, AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider, ThemeContext } from './context/ThemeContext';
import { MOCK_LEADS, MockLead } from './data/mockSeedData';
import { useIsMobile } from './utils/useBreakpoint';

const AppContent: React.FC = () => {
  const { currentUser, users, isLoading } = useAuth();

  // Navigation state: defaults to 'leads' or 'dashboard'
  const [currentView, setCurrentView] = useState<string>('leads');

  // Leads state initialized with realistic 124+ mock seed leads
  const [leads, setLeads] = useState<MockLead[]>(MOCK_LEADS);

  // Calls state for the call console
  const [calls, setCalls] = useState<Call[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [activeCallingLead, setActiveCallingLead] = useState<Lead | null>(null);
  const [activeChatLeadId, setActiveChatLeadId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Refresh handler
  const handleRefreshAll = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Handler: Single Lead update (e.g. inline star rating or stage)
  const handleUpdateLead = (updated: MockLead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  // Handler: Bulk update leads
  const handleBulkUpdate = (leadIds: string[], updates: Partial<MockLead>) => {
    const idSet = new Set(leadIds);
    setLeads((prev) =>
      prev.map((l) => (idSet.has(l.id) ? { ...l, ...updates } : l))
    );
  };

  // Handler: Start Call simulation
  const handleStartCall = (lead: MockLead | Lead) => {
    // Adapt to Lead type
    const adapted: Lead = {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      source: (lead.source || 'Website') as any,
      stage: 'New',
      assignedRepId: users[0]?.id || 'u1',
      assignedRepName: (lead as any).assignee || lead.name,
      notes: (lead as any).notes || 'Initial telecalling inquiry',
      createdDate: (lead as any).createdIso || (lead as any).createdDate || new Date().toISOString()
    };
    setActiveCallingLead(adapted);
  };

  // Handler: Open WhatsApp Chat
  const handleOpenWhatsApp = (lead: MockLead | Lead) => {
    setActiveChatLeadId(lead.id);
    setCurrentView('whatsapp');
  };

  // Convert MockLeads to Kanban-compatible Leads when navigating to Kanban
  const kanbanLeads: Lead[] = leads.map((ml) => ({
    id: ml.id,
    name: ml.name,
    phone: ml.phone,
    source: (ml.source === 'Manual'
      ? 'Manual'
      : ml.source === 'WhatsApp'
      ? 'WhatsApp'
      : ml.source === 'Facebook Ads'
      ? 'Facebook'
      : ml.source === 'Google Ads'
      ? 'Google Ads'
      : ml.source === 'IndiaMART'
      ? 'IndiaMART'
      : 'Website') as any,
    stage: ml.status.includes('Won')
      ? 'Won'
      : ml.status.includes('Lost')
      ? 'Lost'
      : ml.status.includes('Quotation')
      ? 'Negotiation'
      : ml.status.includes('Demo')
      ? 'Follow-up'
      : ml.status.includes('Relevant')
      ? 'Contacted'
      : 'New',
    assignedRepId: users.find((u) => u.name === ml.assignee)?.id || users[0]?.id || 'u1',
    assignedRepName: ml.assignee,
    notes: `${ml.companyOrProject} - Rating: ${ml.rating} stars`,
    createdDate: ml.createdIso
  }));

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#2E6E5C] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
            Initializing DialPulse Security Context...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginModal />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAF8] dark:bg-[#111413] font-sans text-[#191C1B] dark:text-[#E1E3E0] antialiased selection:bg-[#00695C] selection:text-white">
      {/* Icon-only Collapsible Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        callbacksDueCount={4}
        openTicketsCount={1}
      />

      {/* Main Content Viewport */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Fixed Top Bar */}
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenAddLead={() => setIsAddLeadOpen(true)}
          onOpenBulkImport={() => setIsBulkImportOpen(true)}
          onQuickCall={() => {
            if (leads.length > 0) handleStartCall(leads[0]);
          }}
          onRefreshData={handleRefreshAll}
          isRefreshing={isRefreshing}
        />

        {/* View Router */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {/* SCREEN 1: Leads List View */}
          {currentView === 'leads' && (
            <LeadsListView
              leads={leads}
              onUpdateLead={handleUpdateLead}
              onBulkUpdate={handleBulkUpdate}
              onInitiateCall={handleStartCall}
              onOpenChat={handleOpenWhatsApp}
            />
          )}

          {/* SCREEN 2: Dashboard (Home/Reporting View - 2x2 Grid) */}
          {currentView === 'dashboard' && (
            <DashboardView
              leads={leads}
              onNavigateToLeadsFilter={(filterName) => {
                setCurrentView('leads');
              }}
            />
          )}

          {/* SCREEN 3: Leaderboard (Two-Panel Ranks & Detail Stats) */}
          {currentView === 'leaderboard' && <LeaderboardView />}

          {/* SCREEN 4: Home / Getting Started (Onboarding Hub) */}
          {currentView === 'home' && (
            <GettingStartedView
              onNavigateToLeads={() => setCurrentView('leads')}
              onNavigateToDashboard={() => setCurrentView('dashboard')}
              onNavigateToLeaderboard={() => setCurrentView('leaderboard')}
            />
          )}

          {/* Supplementary CRM Views */}
          {currentView === 'pipeline' && (
            <div className="p-4 flex-1 overflow-y-auto">
              <KanbanBoard
                leads={kanbanLeads}
                users={users}
                onUpdateStage={(leadId, stage) => {
                  setLeads((prev) =>
                    prev.map((l) => (l.id === leadId ? { ...l, status: stage as any } : l))
                  );
                }}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onOpenDetail={(lead) => setSelectedLeadForDetail(lead)}
                onStartCall={handleStartCall}
                onOpenWhatsApp={handleOpenWhatsApp}
                onAssignRep={(leadId, repId) => {
                  const rep = users.find((u) => u.id === repId);
                  if (rep) {
                    setLeads((prev) =>
                      prev.map((l) => (l.id === leadId ? { ...l, assignee: rep.name } : l))
                    );
                  }
                }}
                onOpenAddLead={() => setIsAddLeadOpen(true)}
                onOpenBulkImport={() => setIsBulkImportOpen(true)}
                onBulkUpdate={(ids, updates) => {
                  if (updates.stage) {
                    handleBulkUpdate(ids, { status: updates.stage as any });
                  }
                }}
              />
            </div>
          )}

          {currentView === 'calls' && (
            <div className="p-4 flex-1 overflow-y-auto">
              <CallsView
                calls={calls}
                leads={kanbanLeads}
                users={users}
                onStartCall={handleStartCall}
                onOpenWhatsApp={handleOpenWhatsApp}
                onOpenDetail={(lead) => setSelectedLeadForDetail(lead)}
              />
            </div>
          )}

          {currentView === 'whatsapp' && (
            <div className="flex-1 overflow-hidden">
              <WhatsAppView
                leads={kanbanLeads}
                selectedLeadId={activeChatLeadId}
                onSelectLead={setActiveChatLeadId}
                onStartCall={handleStartCall}
                onOpenDetail={(lead) => setSelectedLeadForDetail(lead)}
              />
            </div>
          )}

          {currentView === 'support' && (
            <div className="p-4 flex-1 overflow-y-auto">
              <SupportView leads={kanbanLeads} users={users} />
            </div>
          )}

          {currentView === 'compliance' && (
            <div className="flex-1 overflow-hidden">
              <TrustComplianceView />
            </div>
          )}

          {currentView === 'settings' && (
            <div className="p-4 flex-1 overflow-y-auto">
              <SettingsView onDataReset={handleRefreshAll} />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AddLeadModal
        isOpen={isAddLeadOpen}
        onClose={() => setIsAddLeadOpen(false)}
        onLeadAdded={(newLead) => {
          const ml: MockLead = {
            id: newLead.id,
            name: newLead.name,
            phone: newLead.phone,
            email: 'lead@inquiry.com',
            status: 'Fresh Lead',
            rating: 4,
            assignee: newLead.assignedRepName || 'Aakash Verma',
            assigneeRole: 'Telesales Specialist',
            createdOn: 'Just now',
            createdIso: new Date().toISOString(),
            companyOrProject: newLead.notes || 'Inquiry Project',
            value: 250000,
            source: (newLead.source === 'Facebook' ? 'Facebook Ads' : newLead.source === 'Manual' ? 'Manual' : 'Website') as any,
            industry: 'Real Estate'
          };
          setLeads((prev) => [ml, ...prev]);
        }}
        users={users}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImportComplete={(imported) => {
          const converted: MockLead[] = imported.map((nl) => ({
            id: nl.id,
            name: nl.name,
            phone: nl.phone,
            email: 'bulk.lead@inquiry.com',
            status: 'Fresh Lead',
            rating: 3,
            assignee: nl.assignedRepName || 'Aakash Verma',
            assigneeRole: 'Telesales Specialist',
            createdOn: 'Just now',
            createdIso: new Date().toISOString(),
            companyOrProject: nl.notes || 'Bulk Import Lead',
            value: 180000,
            source: (nl.source === 'Facebook' ? 'Facebook Ads' : nl.source === 'Manual' ? 'Manual' : 'Website') as any,
            industry: 'Real Estate'
          }));
          setLeads((prev) => [...converted, ...prev]);
        }}
        users={users}
      />

      <LeadDetailModal
        lead={selectedLeadForDetail}
        onClose={() => setSelectedLeadForDetail(null)}
        onStartCall={handleStartCall}
        onOpenWhatsApp={handleOpenWhatsApp}
        onUpdateStage={(leadId, stage) => {
          setLeads((prev) =>
            prev.map((l) => (l.id === leadId ? { ...l, status: stage as any } : l))
          );
        }}
        onAssignRep={(leadId, repId) => {
          const rep = users.find((u) => u.id === repId);
          if (rep) {
            setLeads((prev) =>
              prev.map((l) => (l.id === leadId ? { ...l, assignee: rep.name } : l))
            );
          }
        }}
        onUpdateLead={(updated) => {
          setSelectedLeadForDetail(updated);
          setLeads((prev) =>
            prev.map((l) => (l.id === updated.id ? { ...l, name: updated.name, phone: updated.phone } : l))
          );
        }}
        users={users}
      />

      <CallConsoleModal
        isOpen={Boolean(activeCallingLead)}
        lead={activeCallingLead}
        currentUser={currentUser}
        onClose={() => setActiveCallingLead(null)}
        onCallLogged={(callData) => {
          const newCall: Call = {
            id: `call-${Date.now()}`,
            leadId: callData.leadId,
            leadName: activeCallingLead?.name || 'Lead',
            leadPhone: activeCallingLead?.phone || '',
            repId: currentUser?.id || 'u1',
            repName: currentUser?.name || 'Aakash Verma',
            timestamp: new Date().toISOString(),
            duration: callData.duration,
            outcome: callData.outcome,
            notes: callData.notes,
            recordingSimulated: true
          };
          setCalls((prev) => [newCall, ...prev]);
        }}
      />

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && (
        <BottomNavBar
          currentView={currentView}
          onViewChange={setCurrentView}
          onAddLead={() => setIsAddLeadOpen(true)}
        />
      )}

      {/* Material Design 3 Extended Floating Action Button (FAB) — desktop only */}
      {!isMobile && (
      <div className="fixed bottom-6 right-6 z-40 flex items-center space-x-3">
        <button
          id="m3-fab-add-lead"
          type="button"
          onClick={() => setIsAddLeadOpen(true)}
          aria-label="Add new lead"
          className="m3-elevation-3 hover:m3-elevation-4 active:m3-elevation-2 flex items-center space-x-2.5 px-5 py-4 rounded-[24px] bg-[#00695C] text-white hover:bg-[#005449] active:scale-[0.98] transition-all duration-200 min-h-[56px]"
          title="Add New Lead"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
          <span className="text-sm font-medium tracking-wide pr-1">Add Lead</span>
        </button>
      </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const auth = React.useContext(AuthContext);
  const theme = React.useContext(ThemeContext);

  let content = <AppContent />;
  if (!auth) {
    content = <AuthProvider>{content}</AuthProvider>;
  }
  if (!theme) {
    content = <ThemeProvider>{content}</ThemeProvider>;
  }

  return content;
};

export default App;
