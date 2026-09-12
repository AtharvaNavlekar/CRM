import React, { useState } from 'react';
import {
  Home,
  Table,
  LayoutDashboard,
  Trophy,
  Kanban,
  PhoneCall,
  MessageSquare,
  LifeBuoy,
  Settings,
  ChevronLeft,
  ChevronRight,
  Phone,
  Shield,
  Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavView =
  | 'home'
  | 'leads'
  | 'dashboard'
  | 'leaderboard'
  | 'pipeline'
  | 'compliance'
  | 'calls'
  | 'whatsapp'
  | 'support'
  | 'activity'
  | 'settings';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  callbacksDueCount?: number;
  openTicketsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  isOpenMobile = false,
  onCloseMobile = () => {},
  callbacksDueCount = 0,
  openTicketsCount = 0
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentUser } = useAuth();

  const handleSelect = (viewId: NavView) => {
    onViewChange(viewId);
    onCloseMobile();
  };

  const navItems = [
    {
      id: 'home' as NavView,
      label: 'Getting Started',
      shortLabel: 'Home',
      icon: Home,
      badge: 'New',
      badgeColor: 'bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#A3F2E4]',
      desc: 'Onboarding & Integrations'
    },
    {
      id: 'leads' as NavView,
      label: 'Leads Table',
      shortLabel: 'Leads',
      icon: Table,
      badge: '124',
      badgeColor: 'bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0]',
      desc: 'List, Filter & Bulk WACA'
    },
    {
      id: 'dashboard' as NavView,
      label: 'Dashboard',
      shortLabel: 'Dash',
      icon: LayoutDashboard,
      badge: 'Live',
      badgeColor: 'bg-[#00695C] text-white',
      desc: '2x2 Operational Widgets'
    },
    {
      id: 'leaderboard' as NavView,
      label: 'Leaderboard',
      shortLabel: 'Ranks',
      icon: Trophy,
      badge: '#1',
      badgeColor: 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200',
      desc: 'Team Quotas & Talk Time'
    },
    {
      id: 'pipeline' as NavView,
      label: 'Kanban Pipeline',
      shortLabel: 'Kanban',
      icon: Kanban,
      badge: null,
      badgeColor: '',
      desc: 'Visual Stages'
    },
    {
      id: 'compliance' as NavView,
      label: 'Trust & Compliance',
      shortLabel: 'Trust',
      icon: Shield,
      badge: 'Active',
      badgeColor: 'bg-[#CCE8E1] text-[#00201B]',
      desc: 'Verified ID & Fatigue Guard'
    },
    {
      id: 'calls' as NavView,
      label: 'Call Console',
      shortLabel: 'Calls',
      icon: PhoneCall,
      badge: callbacksDueCount > 0 ? `${callbacksDueCount} due` : null,
      badgeColor: 'bg-amber-500 text-white',
      desc: 'Dialer & Dispositions'
    },
    {
      id: 'whatsapp' as NavView,
      label: 'WhatsApp WACA',
      shortLabel: 'Chat',
      icon: MessageSquare,
      badge: 'Meta API',
      badgeColor: 'bg-[#00695C] text-white',
      desc: 'Official Cloud API'
    },
    {
      id: 'support' as NavView,
      label: 'Support Tickets',
      shortLabel: 'Help',
      icon: LifeBuoy,
      badge: openTicketsCount > 0 ? `${openTicketsCount}` : null,
      badgeColor: 'bg-[#BA1A1A] text-white',
      desc: 'SLA Escalations'
    },
    {
      id: 'activity' as NavView,
      label: 'Activity Logs',
      shortLabel: 'Audit',
      icon: Activity,
      badge: 'Audit',
      badgeColor: 'bg-[#00695C] text-white',
      desc: 'Security & Event Trail'
    },
    {
      id: 'settings' as NavView,
      label: 'Admin Settings',
      shortLabel: 'Config',
      icon: Settings,
      badge: null,
      badgeColor: '',
      desc: 'Permissions & Fields'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Material Design 3 Navigation Drawer / Rail */}
      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 shrink-0 bg-[#F2F5F2] dark:bg-[#191C1B] text-[#191C1B] dark:text-[#E1E3E0] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'w-20' : 'w-72'
        } border-r border-[#BEC9C5]/40 dark:border-[#3F4946]/40 shadow-none h-screen select-none`}
      >
        {/* Brand Header (M3 Headline & Logo) */}
        <div className="h-20 px-4 flex items-center justify-between border-b border-[#BEC9C5]/30 dark:border-[#3F4946]/30 bg-[#F8FAF8] dark:bg-[#111413]">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Logo Icon with Material Design 3 Primary Tone */}
            <div className="w-10 h-10 rounded-2xl bg-[#00695C] flex items-center justify-center text-white shadow-sm shrink-0">
              <Phone className="w-5 h-5 text-white" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base tracking-tight text-[#191C1B] dark:text-[#E1E3E0] truncate m3-title-medium">
                    DialPulse CRM
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#A3F2E4]">
                    Pro
                  </span>
                </div>
                <p className="text-xs text-[#6F7976] dark:text-[#89938F] truncate m3-body-small">
                  Telecalling &amp; WhatsApp
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation sidebar"
            className="touch-target-48 rounded-full text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
          >
            ✕
          </button>
        </div>

        {/* User Identity Banner (when expanded) */}
        {!isCollapsed && (
          <div className="mx-4 mt-4 px-3.5 py-3 rounded-2xl bg-[#ECEFEC] dark:bg-[#272B2A] border border-transparent flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00695C] animate-pulse shrink-0" aria-hidden="true"></span>
              <div className="truncate">
                <p className="text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] truncate m3-title-small">
                  {currentUser?.name || 'Aakash Verma'}
                </p>
                <div className="flex items-center space-x-1 text-[11px] text-[#00695C] dark:text-[#80D5C4] font-medium">
                  <Shield className="w-3 h-3" />
                  <span className="capitalize">{currentUser?.role || 'User'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items List with M3 Pill Active Indicator & 48dp Touch Targets */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto" role="navigation" aria-label="Main Navigation">
          {!isCollapsed && (
            <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-[#6F7976] dark:text-[#89938F] m3-label-small">
              Navigation
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full text-left group px-3.5 py-3 rounded-full flex items-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] min-h-[48px] ${
                  isCollapsed ? 'justify-center px-0' : 'justify-between'
                } ${
                  isActive
                    ? 'bg-[#CCE8E1] text-[#00201B] dark:bg-[#005046] dark:text-[#A3F2E4] font-medium shadow-none'
                    : 'text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] hover:text-[#191C1B] dark:hover:text-[#E1E3E0]'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3.5'} min-w-0`}>
                  <div className={`w-6 h-6 flex items-center justify-center shrink-0`}>
                    <Icon
                      className={`w-5 h-5 transition-colors ${
                        isActive
                          ? 'text-[#00201B] dark:text-[#A3F2E4]'
                          : 'text-[#6F7976] group-hover:text-[#00695C] dark:group-hover:text-[#80D5C4]'
                      }`}
                    />
                  </div>
                  {!isCollapsed && (
                    <div className="truncate min-w-0">
                      <div className="text-sm tracking-tight m3-label-large">{item.label}</div>
                      <div className="text-[11px] opacity-75 truncate m3-body-small">{item.desc}</div>
                    </div>
                  )}
                </div>

                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      isActive
                        ? 'bg-[#00695C] text-white'
                        : item.badgeColor || 'bg-[#E0E4E0] text-[#191C1B]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Collapsible Mode Toggle at the Bottom (M3 Pill Icon Button) */}
        <div className="p-3 border-t border-[#BEC9C5]/30 dark:border-[#3F4946]/30 bg-[#F8FAF8] dark:bg-[#111413] flex items-center justify-between">
          <button
            type="button"
            id="btn-toggle-sidebar-collapse"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar to icons'}
            className="w-full flex items-center justify-center p-2.5 rounded-full text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-colors text-xs font-medium space-x-2 min-h-[44px]"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse to Rail'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-xs">Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
