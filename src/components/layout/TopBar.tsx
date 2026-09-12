import React, { useState } from 'react';
import {
  Menu,
  Search,
  Plus,
  Upload,
  Sun,
  Moon,
  Users,
  ChevronDown,
  Shield,
  PhoneCall,
  RefreshCw,
  LogOut,
  AlertCircle,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '../../types';

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
  const { currentUser, users, switchUser, updateCurrentRole, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userMenuFeedback, setUserMenuFeedback] = useState<string | null>(null);

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'owner':
        return 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border-amber-300/80 dark:border-amber-700/80';
      case 'cto':
        return 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-200 border-indigo-300/80 dark:border-indigo-700/80';
      case 'it':
        return 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/80 dark:text-cyan-200 border-cyan-300/80 dark:border-cyan-700/80';
      case 'tl_head':
        return 'bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-200 border-purple-300/80 dark:border-purple-700/80';
      case 'tl':
        return 'bg-sky-100 text-sky-900 dark:bg-sky-950/80 dark:text-sky-200 border-sky-300/80 dark:border-sky-700/80';
      case 'telecaller':
        return 'bg-[#CCE8E1] text-[#00201B] dark:bg-[#004F46] dark:text-[#A3F2E4] border-[#80D5C4]/60';
      default:
        return 'bg-[#ECEFEC] text-[#191C1B] dark:bg-[#272B2A] dark:text-[#E1E3E0] border-[#BEC9C5] dark:border-[#3F4946]';
    }
  };

  const getRoleDisplayName = (role?: UserRole) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'cto': return 'CTO';
      case 'it': return 'IT Admin';
      case 'tl_head': return 'TL Head';
      case 'tl': return 'Team Lead';
      case 'telecaller': return 'Telecaller';
      default: return role || 'User';
    }
  };

  const getRoleScopeDescription = (role?: UserRole) => {
    switch (role) {
      case 'telecaller':
        return 'SELF scope (Only own assigned leads)';
      case 'tl':
        return 'TEAM scope (Entire team leads)';
      case 'tl_head':
        return 'ALL_TEAMS scope (Oversees Mumbai & Delhi)';
      case 'it':
        return 'SYSTEM scope (User accounts & security)';
      case 'owner':
        return 'COMPANY scope (Full company visibility)';
      case 'cto':
        return 'COMPANY scope (Company data & tech governance)';
      default:
        return 'Role-based data access';
    }
  };

  return (
    <header className="h-20 bg-[#F8FAF8]/95 dark:bg-[#111413]/95 backdrop-blur-md border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left side: Navigation Toggle & Material 3 Search Bar */}
      <div className="flex items-center space-x-3 flex-1 max-w-xl">
        <button
          id="btn-open-sidebar"
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Open navigation sidebar"
          className="touch-target-48 rounded-full text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] lg:hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
          title="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Material Design 3 Search Bar (Pill Shape, 48px height) */}
        <div className="relative w-full">
          <Search className="w-5 h-5 text-[#6F7976] dark:text-[#89938F] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="topbar-search-input"
            type="text"
            placeholder="Search leads by name, phone, or project..."
            aria-label="Search leads by name, phone, or requirement"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-[#ECEFEC] dark:bg-[#1D201F] hover:bg-[#E6EAE6] dark:hover:bg-[#272B2A] border border-transparent focus:border-[#00695C] rounded-full text-sm text-[#191C1B] dark:text-[#E1E3E0] placeholder-[#6F7976] dark:placeholder-[#89938F] focus:outline-none focus:ring-2 focus:ring-[#00695C]/25 transition-all shadow-none m3-body-medium min-h-[48px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search input"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[#6F7976] hover:text-[#191C1B] dark:hover:text-[#E1E3E0] hover:bg-[#DAE5E1] dark:hover:bg-[#3F4946] transition-colors focus-visible:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right side: M3 Actions, Theme Toggle, Profile Menu */}
      <div className="flex items-center space-x-2 sm:space-x-3 ml-3">
        {/* Quick Dial Button (M3 Tonal Button with Pill Shape) */}
        <button
          id="btn-quick-call"
          type="button"
          onClick={onQuickCall}
          aria-label="Open quick call console"
          className="hidden md:inline-flex items-center space-x-2 px-4 py-2.5 rounded-full text-sm font-medium bg-[#CCE8E1] dark:bg-[#005046] text-[#00201B] dark:text-[#A3F2E4] hover:bg-[#B7DFD6] dark:hover:bg-[#006558] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-all min-h-[44px]"
          title="Open Call Console"
        >
          <PhoneCall className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
          <span>Quick Call</span>
        </button>

        {/* CSV Import (M3 Outlined Pill Button) */}
        <button
          id="btn-bulk-import"
          type="button"
          onClick={onOpenBulkImport}
          aria-label="Open bulk CSV import"
          className="hidden sm:inline-flex items-center space-x-2 px-4 py-2.5 rounded-full text-sm font-medium text-[#191C1B] dark:text-[#E1E3E0] bg-transparent border border-[#BEC9C5] dark:border-[#3F4946] hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-all min-h-[44px]"
          title="Import leads from CSV"
        >
          <Upload className="w-4 h-4 text-[#6F7976] dark:text-[#89938F]" />
          <span>Import CSV</span>
        </button>

        {/* Add Lead Primary Button (M3 Filled Pill Button) */}
        <button
          id="btn-add-lead-topbar"
          type="button"
          onClick={onOpenAddLead}
          aria-label="Add new sales lead"
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-medium bg-[#00695C] hover:bg-[#005247] text-white shadow-sm hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-all min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Add Lead</span>
        </button>

        {/* Refresh button (M3 Standard Icon Button with 48x48 touch target) */}
        <button
          type="button"
          onClick={onRefreshData}
          disabled={isRefreshing}
          aria-label="Synchronize CRM data"
          className={`touch-target-48 rounded-full text-[#3F4946] hover:text-[#191C1B] dark:text-[#BEC9C5] dark:hover:text-[#E1E3E0] hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-colors ${
            isRefreshing ? 'animate-spin text-[#00695C]' : ''
          }`}
          title="Sync real data"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Theme Toggle (M3 Tonal Icon Button) */}
        <button
          id="btn-theme-toggle"
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="touch-target-48 rounded-full text-[#3F4946] dark:text-[#BEC9C5] hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-colors"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-[#3F4946]" />
          )}
        </button>

        {/* User / Role Switcher Menu (M3 Elevated Menu & Pill Target) */}
        <div className="relative">
          <button
            id="btn-user-role-dropdown"
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-haspopup="menu"
            aria-expanded={showUserMenu}
            aria-label="User account and role menu"
            className="flex items-center space-x-2.5 p-1.5 pl-2 pr-3 rounded-full hover:bg-[#ECEFEC] dark:hover:bg-[#1D201F] border border-[#BEC9C5]/50 dark:border-[#3F4946]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C] transition-colors min-h-[44px]"
          >
            <div className="w-8 h-8 rounded-full bg-[#00695C] text-white font-medium text-xs flex items-center justify-center overflow-hidden ring-2 ring-white dark:ring-[#111413]">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{currentUser?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div className="hidden md:block text-left pr-1">
              <div className="text-xs font-medium text-[#191C1B] dark:text-[#E1E3E0] leading-tight">
                {currentUser?.name}
              </div>
              <div className="text-[11px] text-[#6F7976] dark:text-[#89938F] flex items-center mt-0.5">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${getRoleBadgeStyle(currentUser?.role)}`}>
                  {getRoleDisplayName(currentUser?.role)}
                </span>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-[#6F7976] dark:text-[#89938F]" />
          </button>

          {/* User & Role Dropdown Menu - Styled with M3 rounded-[28px] Dialog/Sheet style */}
          {showUserMenu && (
            <div
              className="absolute right-0 mt-3 w-80 bg-[#F8FAF8] dark:bg-[#1D201F] border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 rounded-[28px] shadow-xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header profile info */}
              <div className="pb-3 mb-3 border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-[#CCE8E1] text-[#00201B] dark:bg-[#005046] dark:text-[#A3F2E4] font-bold text-base flex items-center justify-center">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#191C1B] dark:text-[#E1E3E0] truncate">
                      {currentUser?.name}
                    </p>
                    <p className="text-xs text-[#6F7976] dark:text-[#89938F] truncate">{currentUser?.email}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-1.5 bg-[#ECEFEC] dark:bg-[#272B2A] p-2.5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${getRoleBadgeStyle(currentUser?.role)}`}>
                      {getRoleDisplayName(currentUser?.role)}
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white dark:bg-[#111413] text-[#3F4946] dark:text-[#BEC9C5]">
                      {currentUser?.scope || 'COMPANY'} Scope
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6F7976] dark:text-[#89938F]">
                    {getRoleScopeDescription(currentUser?.role)}
                  </p>
                </div>
              </div>

              {userMenuFeedback && (
                <div className="mb-3 p-2.5 rounded-2xl bg-[#FFDAD6] text-[#410002] text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{userMenuFeedback}</span>
                </div>
              )}

              {/* M3 Segmented Role Switcher */}
              <div className="mb-4">
                <p className="text-xs font-medium text-[#6F7976] dark:text-[#89938F] mb-2 flex items-center justify-between">
                  <span>Switch Role Simulation</span>
                  <span className="text-[10px] uppercase font-mono">RBAC</span>
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { role: 'telecaller' as UserRole, label: 'Telecaller', scope: 'SELF' },
                    { role: 'tl' as UserRole, label: 'Team Lead', scope: 'TEAM' },
                    { role: 'tl_head' as UserRole, label: 'TL Head', scope: 'ALL_TEAMS' },
                    { role: 'it' as UserRole, label: 'IT Admin', scope: 'SYSTEM' },
                    { role: 'owner' as UserRole, label: 'Owner', scope: 'COMPANY' },
                    { role: 'cto' as UserRole, label: 'CTO', scope: 'COMPANY' },
                  ].map((item) => {
                    const isSelected = currentUser?.role === item.role;
                    return (
                      <button
                        key={item.role}
                        id={`btn-switch-role-${item.role}`}
                        onClick={async () => {
                          setUserMenuFeedback(null);
                          try {
                            await updateCurrentRole(item.role);
                            setShowUserMenu(false);
                          } catch (err: any) {
                            setUserMenuFeedback(err.message || 'Failed to switch role. Please try again.');
                          }
                        }}
                        className={`px-3 py-2 rounded-2xl text-xs text-left transition-all flex flex-col justify-center min-h-[44px] ${
                          isSelected
                            ? 'bg-[#00695C] text-white shadow-sm'
                            : 'bg-[#ECEFEC] dark:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0] hover:bg-[#E0E4E0] dark:hover:bg-[#323634]'
                        }`}
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-[#A3F2E4]' : 'text-[#6F7976] dark:text-[#89938F]'}`}>
                          {item.scope}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Switch to Another Team Member */}
              <div className="pt-3 border-t border-[#BEC9C5]/40 dark:border-[#3F4946]/40">
                <p className="text-xs font-medium text-[#6F7976] dark:text-[#89938F] mb-2 flex items-center justify-between">
                  <span>Switch Team Persona</span>
                  <Users className="w-4 h-4" />
                </p>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const isSelected = currentUser?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={async () => {
                          setUserMenuFeedback(null);
                          try {
                            await switchUser(u.id);
                            setShowUserMenu(false);
                          } catch (err: any) {
                            setUserMenuFeedback(err.message || 'Failed to switch user. Please try again.');
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-2xl text-left transition-colors min-h-[44px] ${
                          isSelected
                            ? 'bg-[#CCE8E1] dark:bg-[#005046] text-[#00201B] dark:text-[#A3F2E4] font-medium'
                            : 'hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] text-[#191C1B] dark:text-[#E1E3E0]'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#E0E4E0] dark:bg-[#323634] flex items-center justify-center text-xs font-medium">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs leading-none font-medium">{u.name}</p>
                            <p className="text-[10px] text-[#6F7976] dark:text-[#89938F] mt-0.5">
                              {u.teamId ? (u.teamId === 'team-mumbai' ? 'Mumbai' : u.teamId === 'team-delhi' ? 'Delhi' : u.teamId) : (u.title || getRoleDisplayName(u.role))}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getRoleBadgeStyle(u.role)}`}>
                          {getRoleDisplayName(u.role)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sign Out Button (M3 Text Button with pill outline) */}
              <div className="pt-3 mt-3 border-t border-[#BEC9C5]/40 dark:border-[#3F4946]/40">
                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full text-sm font-medium text-[#BA1A1A] dark:text-[#FFB4AB] hover:bg-[#FFDAD6] dark:hover:bg-[#93000A]/30 transition-colors min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
