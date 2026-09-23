import React, { useState } from 'react';
import {
  Compass,
  Table,
  Kanban,
  PhoneCall,
  MessageSquare,
  LayoutDashboard,
  Trophy,
  LifeBuoy,
  Activity,
  ShieldCheck,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Phone,
  X
} from 'lucide-react';
import { useAuth, usePolicy } from '../../context/AuthContext';
import { StatusBadge } from '../ui/Badge';

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
  | 'platform'
  | 'settings';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: any) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  callbacksDueCount?: number;
  openTicketsCount?: number;
}

interface NavItemConfig {
  id: NavView;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeText?: string | null;
  badgeTone?: 'primary' | 'warning' | 'error' | 'success' | 'info' | 'neutral';
  desc: string;
}

interface NavSection {
  title: string;
  pillar: string;
  items: NavItemConfig[];
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
  const { can } = usePolicy();

  const handleSelect = (viewId: NavView) => {
    onViewChange(viewId);
    onCloseMobile();
  };

  // Structured logically around DialPulse's 4 Operational Pillars
  const sections: NavSection[] = [
    {
      title: 'Capture & Pipeline',
      pillar: 'Pillar 1',
      items: [
        {
          id: 'leads',
          label: 'Leads Table',
          shortLabel: 'Leads',
          icon: Table,
          badgeText: '124',
          badgeTone: 'neutral',
          desc: 'Manage leads & ownership'
        },
        {
          id: 'pipeline',
          label: 'Pipeline Board',
          shortLabel: 'Pipeline',
          icon: Kanban,
          desc: 'Kanban sales workflow'
        },
        {
          id: 'home',
          label: 'Getting Started',
          shortLabel: 'Start',
          icon: Compass,
          desc: 'Onboarding & quick setups'
        }
      ]
    },
    {
      title: 'Communicate',
      pillar: 'Pillar 2',
      items: [
        {
          id: 'calls',
          label: 'Call Console',
          shortLabel: 'Calls',
          icon: PhoneCall,
          badgeText: callbacksDueCount > 0 ? `${callbacksDueCount} due` : null,
          badgeTone: callbacksDueCount > 0 ? 'warning' : undefined,
          desc: 'Dialer & dispositions'
        },
        {
          id: 'whatsapp',
          label: 'WhatsApp WACA',
          shortLabel: 'Chat',
          icon: MessageSquare,
          badgeText: 'Official API',
          badgeTone: 'primary',
          desc: 'Meta Cloud API inbox'
        }
      ]
    },
    {
      title: 'Manage & Supervise',
      pillar: 'Pillar 3',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          shortLabel: 'Dash',
          icon: LayoutDashboard,
          desc: 'Operational KPI telemetry'
        },
        {
          id: 'leaderboard',
          label: 'Leaderboard',
          shortLabel: 'Ranks',
          icon: Trophy,
          desc: 'Rep rankings & quotas'
        },
        {
          id: 'support',
          label: 'Support Tickets',
          shortLabel: 'Support',
          icon: LifeBuoy,
          badgeText: openTicketsCount > 0 ? `${openTicketsCount}` : null,
          badgeTone: openTicketsCount > 0 ? 'error' : undefined,
          desc: 'SLA escalations & help'
        },
        {
          id: 'activity',
          label: 'Activity Logs',
          shortLabel: 'Audit',
          icon: Activity,
          desc: 'Security & mutation trail'
        }
      ]
    },
    {
      title: 'Comply & Protect',
      pillar: 'Pillar 4',
      items: [
        {
          id: 'compliance',
          label: 'Trust & Compliance',
          shortLabel: 'Trust',
          icon: ShieldCheck,
          badgeText: 'Active',
          badgeTone: 'success',
          desc: 'Fatigue guard & DND checks'
        },
        ...(currentUser?.isPlatformStaff
          ? [
              {
                id: 'platform' as NavView,
                label: 'Platform Ops',
                shortLabel: 'Ops',
                icon: Shield,
                badgeText: 'Admin',
                badgeTone: 'info' as const,
                desc: 'Multi-tenant infrastructure'
              }
            ]
          : []),
        ...(can('manage:policy')
          ? [
              {
                id: 'settings' as NavView,
                label: 'Admin Settings',
                shortLabel: 'Settings',
                icon: Settings,
                desc: 'RBAC policies & tenant config'
              }
            ]
          : [])
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Material 3 Application Navigation Sidebar */}
      <aside
        id="app-sidebar"
        role="navigation"
        aria-label="Main CRM Navigation"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 shrink-0 bg-[#FFFFFF] dark:bg-[#111514] text-[#0F172A] dark:text-[#F1F5F9] flex flex-col transition-all duration-200 ease-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isCollapsed ? 'w-20' : 'w-64'
        } border-r border-[#E2E8F0] dark:border-[#334155] shadow-xs lg:shadow-none h-screen select-none font-body`}
      >
        {/* Brand & Organization Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111514] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Primary DialPulse Emblem */}
            <div className="w-9 h-9 rounded-xl bg-[#00695C] dark:bg-[#80D5C4] flex items-center justify-center text-white dark:text-[#003830] shadow-xs shrink-0">
              <Phone className="w-5 h-5 text-current" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base font-heading tracking-tight text-[#0F172A] dark:text-[#F1F5F9] truncate">
                    DialPulse
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#A3F2E4] uppercase">
                    CRM
                  </span>
                </div>
                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate leading-tight">
                  Telecalling &amp; WhatsApp
                </p>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation sidebar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F1F5F9] hover:bg-[#F1F5F4] dark:hover:bg-[#1E293B] lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Pillar Navigation Modules */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {sections.map((sec, secIdx) => (
            <div key={sec.title} className="space-y-1">
              {!isCollapsed ? (
                <div className="px-2 pt-1 pb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                    {sec.title}
                  </span>
                  <span className="text-[9px] font-mono text-[#94A3B8] dark:text-[#64748B]">
                    {sec.pillar}
                  </span>
                </div>
              ) : (
                secIdx > 0 && (
                  <div className="my-2 border-t border-[#E2E8F0] dark:border-[#334155]" />
                )
              )}

              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <button
                      key={item.id}
                      id={`sidebar-nav-${item.id}`}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      title={isCollapsed ? `${item.label} — ${item.desc}` : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] ${
                        isActive
                          ? 'bg-[#CCE8E1] text-[#00201B] font-semibold dark:bg-[#004F46] dark:text-[#A3F2E4]'
                          : 'text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F4] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F1F5F9]'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      {/* Active Indicator Bar */}
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#00695C] dark:bg-[#80D5C4] rounded-r-md"
                          aria-hidden="true"
                        />
                      )}

                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#00695C] dark:text-[#80D5C4]'
                            : 'text-[#64748B] dark:text-[#94A3B8] group-hover:text-[#0F172A] dark:group-hover:text-[#F1F5F9]'
                        }`}
                      />

                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badgeText && (
                            <StatusBadge
                              status={item.badgeText}
                              tone={item.badgeTone || 'neutral'}
                              showDot={false}
                              size="sm"
                              className="ml-1.5"
                            />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Collapse Rail Toggle */}
        <div className="p-3 border-t border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAF9] dark:bg-[#111514] shrink-0">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-[#475569] dark:text-[#94A3B8] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
