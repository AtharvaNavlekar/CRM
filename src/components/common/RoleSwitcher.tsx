import React, { useState, useRef, useEffect } from 'react';
import { Shield, ChevronDown, Check, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface RoleConfig {
  role: UserRole;
  label: string;
  scope: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

const ROLES: RoleConfig[] = [
  {
    role: 'telecaller',
    label: 'Telecaller',
    scope: 'SELF',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    description: 'Assigned leads only. Call dialer, WhatsApp, update stage.'
  },
  {
    role: 'tl',
    label: 'Team Lead',
    scope: 'TEAM',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800',
    badgeText: 'text-blue-800 dark:text-blue-300',
    description: 'All leads in team. Lead assignment, review recordings.'
  },
  {
    role: 'tl_head',
    label: 'TL Head',
    scope: 'ALL_TEAMS',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    description: 'Cross-team oversight. Manage stages, team quotas.'
  },
  {
    role: 'it',
    label: 'IT Admin',
    scope: 'SYSTEM',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
    badgeText: 'text-amber-900 dark:text-amber-200',
    description: 'Custom fields, auto-assignment, compliance rules, backups.'
  },
  {
    role: 'owner',
    label: 'Owner',
    scope: 'COMPANY',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800',
    badgeText: 'text-purple-800 dark:text-purple-300',
    description: 'Full administrative access. Role matrix, data exports.'
  },
  {
    role: 'cto',
    label: 'CTO',
    scope: 'COMPANY',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    description: 'Technical oversight. API tokens, security audit, export approvals.'
  }
];

export const RoleSwitcher: React.FC = () => {
  const { currentUser, updateCurrentRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeRoleConfig = ROLES.find((r) => r.role === currentUser?.role) || ROLES[0];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleRoleSelect = async (newRole: UserRole) => {
    if (newRole === currentUser?.role) {
      setIsOpen(false);
      return;
    }

    setIsSwitching(true);
    setFeedback(null);
    try {
      await updateCurrentRole(newRole);
      setFeedback(`Switched to ${newRole.toUpperCase()} role`);
      setTimeout(() => setFeedback(null), 2500);
      setIsOpen(false);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to switch role');
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - M3 Tonal Pill */}
      <button
        type="button"
        id="btn-dev-role-switcher"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Development role switcher for testing RBAC permissions"
        className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-[#BEC9C5]/50 dark:border-[#3F4946]/50 bg-[#ECEFEC]/80 dark:bg-[#1D201F]/80 hover:bg-[#E0E4E0] dark:hover:bg-[#272B2A] transition-all min-h-[40px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00695C]"
        title="Quick Role Switcher for RBAC Authorization Testing"
      >
        <div className="flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-[#00695C] dark:text-[#80D5C4] shrink-0" />
          <span className="hidden xl:inline text-[11px] font-semibold uppercase tracking-wider text-[#6F7976] dark:text-[#89938F]">
            Dev RBAC:
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors ${activeRoleConfig.badgeBg} ${activeRoleConfig.badgeText}`}
        >
          {activeRoleConfig.label}
        </span>

        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/70 dark:bg-black/40 text-[#3F4946] dark:text-[#BEC9C5] hidden lg:inline">
          {activeRoleConfig.scope}
        </span>

        {isSwitching ? (
          <RefreshCw className="w-3.5 h-3.5 text-[#00695C] animate-spin shrink-0" />
        ) : (
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#6F7976] dark:text-[#89938F] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>

      {/* Floating Feedback Notification */}
      {feedback && (
        <div className="absolute top-12 left-0 z-50 px-3 py-1.5 rounded-full bg-[#00695C] text-white text-xs font-medium shadow-md flex items-center space-x-1.5 whitespace-nowrap animate-in fade-in slide-in-from-top-1">
          <Sparkles className="w-3.5 h-3.5 text-[#A3F2E4]" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Dropdown Menu - M3 Dialog Surface */}
      {isOpen && (
        <div
          role="listbox"
          id="role-switcher-dropdown"
          className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-80 sm:w-96 bg-[#F8FAF8] dark:bg-[#1D201F] border border-[#BEC9C5]/60 dark:border-[#3F4946]/60 rounded-[28px] shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="px-3 pt-2 pb-2.5 border-b border-[#BEC9C5]/40 dark:border-[#3F4946]/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#191C1B] dark:text-[#E1E3E0] flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-[#00695C] dark:text-[#80D5C4]" />
                <span>RBAC Test Switcher</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#CCE8E1] dark:bg-[#004F46] text-[#00201B] dark:text-[#A3F2E4] font-semibold">
                Dev Tool
              </span>
            </div>
            <p className="text-[11px] text-[#6F7976] dark:text-[#89938F] mt-1 leading-snug">
              Temporarily adopt different roles to verify authorization policies and view scopes.
            </p>
          </div>

          {/* Role options list */}
          <div className="py-2 space-y-1.5 max-h-80 overflow-y-auto">
            {ROLES.map((r) => {
              const isSelected = currentUser?.role === r.role;
              return (
                <button
                  key={r.role}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  id={`role-opt-${r.role}`}
                  onClick={() => handleRoleSelect(r.role)}
                  className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-start justify-between space-x-3 ${
                    isSelected
                      ? 'bg-[#CCE8E1]/80 dark:bg-[#005046]/80 border border-[#00695C]/30 shadow-xs'
                      : 'hover:bg-[#ECEFEC] dark:hover:bg-[#272B2A] border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${r.badgeBg} ${r.badgeText}`}>
                        {r.label}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-md bg-[#E0E4E0] dark:bg-[#2A2E2C] text-[#3F4946] dark:text-[#BEC9C5]">
                        {r.scope} Scope
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6F7976] dark:text-[#89938F] mt-1 line-clamp-2 leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-[#00695C] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer with warning notice */}
          <div className="px-3 pt-2.5 pb-1 border-t border-[#BEC9C5]/40 dark:border-[#3F4946]/40 text-[10px] text-[#6F7976] dark:text-[#89938F] flex items-center justify-between">
            <span>Server re-issues valid scoped JWT.</span>
            <span className="font-mono">Current: {currentUser?.scope || 'COMPANY'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
