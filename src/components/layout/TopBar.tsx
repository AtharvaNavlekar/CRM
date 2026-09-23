import React, { useState } from 'react';
import {
  Menu,
  PhoneCall,
  Upload,
  Plus,
  RefreshCw,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  Building2,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '../../types';
import { SearchInput } from '../ui/SearchInput';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';

interface TopBarProps {
  onOpenMobileSidebar?: () => void;
  onOpenAddLead: () => void;
  onOpenBulkImport: () => void;
  onQuickCall?: () => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileSidebar = () => {},
  onOpenAddLead,
  onOpenBulkImport,
  onQuickCall = () => {},
  onSearchChange,
  searchQuery,
  onRefreshData = () => {},
  isRefreshing = false
}) => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleDisplayName = (role?: UserRole) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'cto':
        return 'CTO';
      case 'it':
        return 'IT Admin';
      case 'tl_head':
        return 'TL Head';
      case 'tl':
        return 'Team Lead';
      case 'telecaller':
        return 'Telecaller';
      default:
        return role || 'User';
    }
  };

  const getRoleScopeDescription = (role?: UserRole) => {
    switch (role) {
      case 'telecaller':
        return 'SELF scope (Only assigned leads)';
      case 'tl':
        return 'TEAM scope (Team leads & quotas)';
      case 'tl_head':
        return 'ALL_TEAMS scope (Multi-city supervision)';
      case 'it':
        return 'SYSTEM scope (Security & user accounts)';
      case 'owner':
        return 'COMPANY scope (Full tenant visibility)';
      case 'cto':
        return 'COMPANY scope (Tech governance & data)';
      default:
        return 'Role-based access boundary';
    }
  };

  return (
    <header className="h-16 bg-[#FFFFFF]/95 dark:bg-[#111514]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#334155] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors font-body select-none">
      {/* Left side: Mobile Toggle, Workspace Context & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl min-w-0">
        {/* Mobile menu trigger */}
        <button
          id="btn-open-sidebar"
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation sidebar"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F4] dark:hover:bg-[#1E293B] lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Workspace / Tenant Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F8FAF9] dark:bg-[#161A19] border border-[#E2E8F0] dark:border-[#334155] text-xs text-[#0F172A] dark:text-[#F1F5F9] shrink-0">
          <Building2 className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4]" />
          <span className="font-semibold font-heading">DialPulse Realty</span>
          <span className="text-[#94A3B8] dark:text-[#64748B]">·</span>
          <span className="text-[#64748B] dark:text-[#94A3B8] text-[11px]">Production</span>
        </div>

        {/* Global Search Input */}
        <div className="w-full max-w-md">
          <SearchInput
            id="topbar-search-input"
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search leads by name, phone, or project..."
            shortcut="/"
            inputSize="md"
          />
        </div>
      </div>

      {/* Right side: Actions, Theme, User Menu */}
      <div className="flex items-center gap-2 sm:gap-3 ml-3 shrink-0">
        {/* Quick Call */}
        <Button
          id="btn-quick-call"
          variant="tonal"
          size="md"
          onClick={onQuickCall}
          leftIcon={<PhoneCall className="w-4 h-4" />}
          className="hidden md:inline-flex"
        >
          Quick Call
        </Button>

        {/* Import CSV */}
        <Button
          id="btn-bulk-import"
          variant="secondary"
          size="md"
          onClick={onOpenBulkImport}
          leftIcon={<Upload className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8]" />}
          className="hidden sm:inline-flex"
        >
          Import CSV
        </Button>

        {/* Add Lead Primary Button */}
        <Button
          id="btn-add-lead-topbar"
          variant="primary"
          size="md"
          onClick={onOpenAddLead}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          <span className="hidden xs:inline">Add Lead</span>
          <span className="xs:hidden">Add</span>
        </Button>

        {/* Sync / Refresh Button */}
        <button
          type="button"
          onClick={onRefreshData}
          disabled={isRefreshing}
          aria-label="Synchronize data"
          title="Synchronize data"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F4] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#00695C] dark:text-[#80D5C4]' : ''}`}
          />
        </button>

        {/* Theme Toggle */}
        <button
          id="btn-theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#475569] dark:text-[#94A3B8] hover:bg-[#F1F5F4] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F1F5F9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#475569]" />
          )}
        </button>

        {/* User Account / Scope Menu */}
        <div className="relative">
          <button
            id="btn-user-role-dropdown"
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            aria-label="User account and role menu"
            className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 rounded-xl hover:bg-[#F1F5F4] dark:hover:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
          >
            <div className="w-7 h-7 rounded-lg bg-[#00695C] dark:bg-[#80D5C4] text-white dark:text-[#003830] font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover rounded-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{currentUser?.name?.charAt(0) || 'U'}</span>
              )}
            </div>

            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-[#0F172A] dark:text-[#F1F5F9] leading-tight">
                {currentUser?.name}
              </div>
              <div className="text-[10px] text-[#64748B] dark:text-[#94A3B8] leading-none mt-0.5">
                {getRoleDisplayName(currentUser?.role)}
              </div>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] dark:text-[#64748B]" />
          </button>

          {/* User Account Dropdown Dialog */}
          {showUserMenu && (
            <div
              className="absolute right-0 mt-2 w-76 bg-[#FFFFFF] dark:bg-[#161A19] border border-[#E2E8F0] dark:border-[#334155] rounded-2xl shadow-xl z-50 p-4 animate-in fade-in duration-150 font-body"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 pb-3 border-b border-[#F1F5F4] dark:border-[#202726]">
                <div className="w-10 h-10 rounded-xl bg-[#CCE8E1] text-[#00201B] dark:bg-[#004F46] dark:text-[#A3F2E4] font-bold text-sm flex items-center justify-center shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
                    {currentUser?.name}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
                    {currentUser?.email}
                  </p>
                </div>
              </div>

              {/* RBAC Scope Card */}
              <div className="my-3 p-3 rounded-xl bg-[#F8FAF9] dark:bg-[#111514] border border-[#E2E8F0] dark:border-[#334155] space-y-1.5">
                <div className="flex items-center justify-between">
                  <StatusBadge
                    status={getRoleDisplayName(currentUser?.role)}
                    tone="primary"
                    size="sm"
                  />
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#E2E8F0] dark:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8]">
                    {currentUser?.scope || 'COMPANY'} Scope
                  </span>
                </div>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4] shrink-0" />
                  <span>{getRoleScopeDescription(currentUser?.role)}</span>
                </p>
              </div>

              {/* Sign out */}
              <button
                type="button"
                onClick={async () => {
                  setShowUserMenu(false);
                  await logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[#BA1A1A] dark:text-[#FFB4AB] hover:bg-[#FFDAD6]/40 dark:hover:bg-[#410002]/30 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
