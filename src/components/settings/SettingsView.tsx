import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Database,
  FileText,
  UserPlus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  Lock,
  Search,
  HardDrive,
  Users,
  Zap,
  Layers,
  Sliders,
  Plus,
  Trash2,
  Save,
  Check,
  Sun,
  Moon,
  Info,
  ShieldAlert,
  Key
} from 'lucide-react';
import {
  User,
  AuditLog,
  BackupRecord,
  UserRole,
  CustomField,
  RolePermission,
  PipelineStageConfig,
  LeadStage,
  ViewScope,
  Action,
  Team
} from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface SettingsViewProps {
  onDataReset: () => void;
}

const ALL_AVAILABLE_ACTIONS: { id: Action; label: string; short: string; description: string }[] = [
  { id: 'VIEW', label: 'View Leads', short: 'VIEW', description: 'Read lead records within user view scope' },
  { id: 'EDIT', label: 'Edit Leads', short: 'EDIT', description: 'Update lead stages, notes, and profile details' },
  { id: 'REASSIGN', label: 'Reassign Leads', short: 'REASSIGN', description: 'Change owner or transfer to another sales rep' },
  { id: 'EXPORT', label: 'Export Data', short: 'EXPORT', description: 'Export lead datasets to CSV or JSON formats' },
  { id: 'DELETE', label: 'Delete Records', short: 'DELETE', description: 'Permanently remove lead records' },
  { id: 'MANAGE_USERS', label: 'Manage Users', short: 'USERS', description: 'Provision, edit, and deactivate user accounts' },
  { id: 'MANAGE_POLICY', label: 'Manage Policies', short: 'POLICY', description: 'Configure RBAC matrices, pipeline stages & custom fields' },
  { id: 'MANAGE_COMPLIANCE_RULES', label: 'Compliance Rules', short: 'COMPLIANCE', description: 'Configure calling frequency caps and quiet hours' },
];

export const SettingsView: React.FC<SettingsViewProps> = ({ onDataReset }) => {
  const { currentUser, users, refreshUsers, updateCurrentRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'automation' | 'pipeline' | 'fields' | 'rbac' | 'backups' | 'audit'>('automation');

  // General / Auto-Assignment State
  const [autoAssignment, setAutoAssignment] = useState<boolean>(true);
  const [isSavingAutoAssign, setIsSavingAutoAssign] = useState(false);

  // Pipeline Stages State
  const [pipelineStages, setPipelineStages] = useState<PipelineStageConfig[]>([]);
  const [isSavingPipeline, setIsSavingPipeline] = useState(false);

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isSavingFields, setIsSavingFields] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'select' | 'date'>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);

  // Teams & Multi-Tier RBAC State
  const [teams, setTeams] = useState<Team[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  // RBAC User Add State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('telecaller');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserTeamId, setNewUserTeamId] = useState<string>('team-mumbai');
  const [newUserManagesTeams, setNewUserManagesTeams] = useState<string[]>(['team-mumbai', 'team-delhi']);
  const [newUserPassword, setNewUserPassword] = useState('');

  // Backups State
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState('');

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState('');

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchSettings = async () => {
    try {
      const [data, teamsData] = await Promise.all([
        api.getSettings(),
        api.getTeams().catch(() => [])
      ]);

      if (teamsData && Array.isArray(teamsData)) {
        setTeams(teamsData);
      }

      if (data) {
        if (data.autoAssignmentEnabled !== undefined) setAutoAssignment(data.autoAssignmentEnabled);
        if (data.pipelineStages) setPipelineStages(data.pipelineStages);
        if (data.customFields) setCustomFields(data.customFields);
        if (data.rolePermissions) setRolePermissions(data.rolePermissions);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const fetchBackups = async () => {
    try {
      const data = await api.getBackups();
      setBackups(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await api.getAuditLogs();
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBackups();
    fetchAuditLogs();
  }, [activeTab]);

  // Handler: Toggle Auto Assignment
  const handleToggleAutoAssignment = async () => {
    setIsSavingAutoAssign(true);
    try {
      const nextVal = !autoAssignment;
      await api.toggleAutoAssignment(nextVal);
      setAutoAssignment(nextVal);
      showNotification(`Auto-Assignment ${nextVal ? 'enabled' : 'disabled'} successfully!`);
    } catch (e) {
      showNotification('Failed to update auto-assignment', 'error');
    } finally {
      setIsSavingAutoAssign(false);
    }
  };

  // Handler: Save Custom Fields
  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const newField: CustomField = {
      id: `cf_${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options: newFieldType === 'select' ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean) : undefined
    };

    const updated = [...customFields, newField];
    setIsSavingFields(true);
    try {
      await api.updateCustomFields(updated);
      setCustomFields(updated);
      setNewFieldName('');
      setNewFieldOptions('');
      setNewFieldRequired(false);
      showNotification('Custom field added successfully!');
    } catch (e) {
      showNotification('Failed to add custom field', 'error');
    } finally {
      setIsSavingFields(false);
    }
  };

  const handleDeleteCustomField = async (id: string) => {
    const updated = customFields.filter((f) => f.id !== id);
    setIsSavingFields(true);
    try {
      await api.updateCustomFields(updated);
      setCustomFields(updated);
      showNotification('Custom field removed.');
    } catch (e) {
      showNotification('Failed to remove custom field', 'error');
    } finally {
      setIsSavingFields(false);
    }
  };

  // RBAC Matrix Action Handlers
  const handleToggleAction = (role: string, action: Action) => {
    setRolePermissions((prev) =>
      prev.map((rp) => {
        if (rp.role === role) {
          const has = rp.actions.includes(action);
          const nextActions = has ? rp.actions.filter((a) => a !== action) : [...rp.actions, action];
          return {
            ...rp,
            actions: nextActions,
            canExportData: nextActions.includes('EXPORT'),
            canManageTemplates: nextActions.includes('MANAGE_POLICY')
          };
        }
        return rp;
      })
    );
  };

  const handleToggleRequiresApproval = (role: string, action: Action) => {
    setRolePermissions((prev) =>
      prev.map((rp) => {
        if (rp.role === role) {
          const req = rp.requiresApproval || [];
          const nextReq = req.includes(action) ? req.filter((a) => a !== action) : [...req, action];
          return { ...rp, requiresApproval: nextReq };
        }
        return rp;
      })
    );
  };

  const handleChangeScope = (role: string, scope: ViewScope) => {
    setRolePermissions((prev) =>
      prev.map((rp) => {
        if (rp.role === role) {
          return {
            ...rp,
            scope,
            canViewAllLeads: scope === 'ALL_TEAMS' || scope === 'COMPANY'
          };
        }
        return rp;
      })
    );
  };

  const handleSaveRolePermissions = async () => {
    setIsSavingRoles(true);
    try {
      await api.updateRolePermissions(rolePermissions);
      showNotification('Multi-tier RBAC permission matrix updated successfully!');
      fetchAuditLogs();
    } catch (e: any) {
      showNotification(e.message || 'Failed to save permissions. Requires MANAGE_POLICY.', 'error');
    } finally {
      setIsSavingRoles(false);
    }
  };

  // Handler: Save Pipeline Stages
  const handleStageTitleChange = (stageId: LeadStage, newTitle: string) => {
    setPipelineStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, title: newTitle } : s))
    );
  };

  const handleSavePipelineStages = async () => {
    setIsSavingPipeline(true);
    try {
      await api.updatePipelineStages(pipelineStages);
      showNotification('Pipeline stages configuration saved!');
    } catch (e) {
      showNotification('Failed to save pipeline configuration', 'error');
    } finally {
      setIsSavingPipeline(false);
    }
  };

  // Backup handlers
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const snap = await api.createBackup(
        `Manual Snapshot ${new Date().toLocaleTimeString('en-IN')}`,
        currentUser?.name,
        currentUser?.role
      );
      setBackups((prev) => [snap, ...prev]);
      showNotification('Backup snapshot created successfully!');
      fetchAuditLogs();
    } catch (e) {
      showNotification('Failed to create snapshot', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (id: string) => {
    if (!confirm('Are you sure you want to restore this database snapshot? Current leads will be replaced with the snapshot data.')) {
      return;
    }
    try {
      await api.restoreBackup(id, currentUser?.name, currentUser?.role);
      showNotification('Database successfully restored from snapshot!');
      onDataReset();
      fetchAuditLogs();
    } catch (e) {
      showNotification('Failed to restore snapshot', 'error');
    }
  };

  // RBAC User Add
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    try {
      const payload: any = {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        phone: newUserPhone.trim() || undefined,
        password: newUserPassword.trim() || undefined
      };

      if (newUserRole === 'telecaller' || newUserRole === 'tl') {
        payload.teamId = newUserTeamId;
      } else if (newUserRole === 'tl_head') {
        payload.managesTeamIds = newUserManagesTeams;
      }

      await api.createUser(payload);
      await refreshUsers();
      setIsAddingUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPhone('');
      setNewUserPassword('');
      showNotification('New team member registered successfully with assigned scope!');
      fetchAuditLogs();
    } catch (e: any) {
      showNotification(e.message || 'Failed to register user. Check permissions.', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset TeleCRM 2.0 to default Indian SMB sample data?')) return;
    try {
      await api.resetData(currentUser?.name, currentUser?.role);
      onDataReset();
      fetchAuditLogs();
      fetchBackups();
      fetchSettings();
      showNotification('Data reset to default Indian SMB sample state.');
    } catch (e) {
      showNotification('Reset failed', 'error');
    }
  };

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
      log.details.toLowerCase().includes(auditFilter.toLowerCase()) ||
      log.userName.toLowerCase().includes(auditFilter.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-bold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#1F3A5F] text-white flex items-center justify-center font-bold">
            <Settings className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              System Settings & CRM Configurations
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lead auto-assignment, custom fields, pipeline stages, RBAC permissions, and snapshots
            </p>
          </div>
        </div>

        <button
          onClick={handleResetDefaults}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 transition-colors flex items-center space-x-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Indian Data</span>
        </button>
      </div>

      {/* Tabs bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6 overflow-x-auto">
        <button
          id="tab-automation"
          onClick={() => setActiveTab('automation')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'automation'
              ? 'border-[#2E6E5C] text-[#2E6E5C] dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Auto-Assignment & Routing</span>
        </button>

        <button
          id="tab-pipeline"
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'pipeline'
              ? 'border-[#2E6E5C] text-[#2E6E5C] dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-[#1F3A5F] dark:text-teal-300" />
          <span>Pipeline Stages</span>
        </button>

        <button
          id="tab-fields"
          onClick={() => setActiveTab('fields')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'fields'
              ? 'border-[#2E6E5C] text-[#2E6E5C] dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-500" />
          <span>Custom Fields ({customFields.length})</span>
        </button>

        <button
          id="tab-rbac"
          onClick={() => setActiveTab('rbac')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'rbac'
              ? 'border-[#2E6E5C] text-[#2E6E5C] dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4 text-emerald-600" />
          <span>Role Permissions (RBAC)</span>
        </button>

        <button
          id="tab-backups"
          onClick={() => setActiveTab('backups')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'backups'
              ? 'border-[#2E6E5C] text-[#2E6E5C] dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Backups ({backups.length})</span>
        </button>

        <button
          id="tab-audit"
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'border-[#2E6E5C] text-[#2E6E5C] dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: Auto-Assignment & Routing */}
      {activeTab === 'automation' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Round-Robin Lead Auto-Distribution Engine</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  When enabled, incoming leads captured from WhatsApp, IndiaMART, Website Forms, and CSV imports are automatically cycled evenly among active Sales Reps to eliminate response lag.
                </p>
              </div>

              <button
                id="btn-toggle-auto-assign-settings"
                onClick={handleToggleAutoAssignment}
                disabled={isSavingAutoAssign}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                  autoAssignment
                    ? 'bg-[#2E6E5C] text-white hover:bg-[#245b4c]'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${autoAssignment ? 'bg-emerald-300 animate-ping' : 'bg-slate-400'}`} />
                <span>{autoAssignment ? 'Auto-Assignment: ACTIVE' : 'Auto-Assignment: PAUSED'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">1. Instant Webhook Capture</span>
                <p className="text-slate-500 mt-1">
                  Incoming IndiaMART or WhatsApp inquiries are assigned within &lt;100ms.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">2. Fair Load Balancing</span>
                <p className="text-slate-500 mt-1">
                  Prevents single-caller burnout by rotating sequentially through all registered active reps.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200">3. Indian Business Hours</span>
                <p className="text-slate-500 mt-1">
                  Optimized for standard 09:30 AM to 07:30 PM IST high-velocity telecalling floors.
                </p>
              </div>
            </div>
          </div>

          {/* Theme & Display Appearance */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Appearance & Workspace Theme</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Choose between high-contrast crisp White Theme for bright sales floor environments or low-light Dark Theme for night calling shifts.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                id="btn-select-theme-light"
                onClick={() => {
                  setTheme('light');
                  showNotification('Switched to White Theme (Light Mode)');
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start space-x-3.5 ${
                  theme === 'light'
                    ? 'border-[#2E6E5C] bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${theme === 'light' ? 'bg-[#2E6E5C] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  <Sun className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">White Theme (Clean Light SaaS)</span>
                    {theme === 'light' && (
                      <span className="text-[10px] bg-[#2E6E5C] text-white px-2 py-0.5 rounded-full font-bold">Active</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Crisp white panels, high-contrast typography, and clean borders for day shifts.
                  </p>
                </div>
              </button>

              <button
                type="button"
                id="btn-select-theme-dark"
                onClick={() => {
                  setTheme('dark');
                  showNotification('Switched to Dark Theme');
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-start space-x-3.5 ${
                  theme === 'dark'
                    ? 'border-[#2E6E5C] bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-[#2E6E5C] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  <Moon className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100">Dark Theme (Night Calling)</span>
                    {theme === 'dark' && (
                      <span className="text-[10px] bg-[#2E6E5C] text-white px-2 py-0.5 rounded-full font-bold">Active</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Low-contrast navy & slate palette to reduce eye fatigue during late shifts.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Pipeline Stages Configuration */}
      {activeTab === 'pipeline' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Custom Pipeline Stages
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Customize the labels of the 6 core stages matching Indian sales cycles (Fresh, Contacted, Follow Up, Meeting, Deal Won, Lost)
                </p>
              </div>

              <button
                id="btn-save-pipeline-stages"
                onClick={handleSavePipelineStages}
                disabled={isSavingPipeline}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#1F3A5F] text-white hover:bg-[#162A45] text-xs font-bold transition-all shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingPipeline ? 'Saving...' : 'Save Stages'}</span>
              </button>
            </div>

            <div className="space-y-3">
              {pipelineStages.map((stage, idx) => (
                <div
                  key={stage.id}
                  className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.dotBg || '#2E6E5C' }}></div>
                  <div className="flex-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      ID: {stage.id}
                    </span>
                    <input
                      type="text"
                      value={stage.title}
                      onChange={(e) => handleStageTitleChange(stage.id, e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2E6E5C]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Custom Fields */}
      {activeTab === 'fields' && (
        <div className="space-y-5">
          {/* Add Custom Field Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Add Industry-Specific Custom Field
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Capture tailored information for Real Estate (Flat type, Carpet area), Lending (CIBIL score, Salary), Education (Course, Batch), or Insurance (Vehicle No).
            </p>

            <form onSubmit={handleAddCustomField} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Field Label (e.g. CIBIL Score, BHK Type)"
                required
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-semibold m3-select"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="select">Dropdown Select</option>
                <option value="date">Date</option>
              </select>
              {newFieldType === 'select' ? (
                <input
                  type="text"
                  placeholder="Options comma-separated (e.g. 1 BHK, 2 BHK, 3 BHK)"
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              ) : (
                <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="rounded text-[#2E6E5C]"
                  />
                  <span>Required on Lead Creation</span>
                </label>
              )}
              <button
                type="submit"
                disabled={isSavingFields || !newFieldName.trim()}
                className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-[#2E6E5C] hover:bg-[#235849] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </form>
          </div>

          {/* List of Custom Fields */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Custom Fields ({customFields.length})
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {customFields.map((field) => (
                <div key={field.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{field.name}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 border border-rose-200">
                          Required
                        </span>
                      )}
                    </div>
                    {field.options && field.options.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Options: {field.options.join(' • ')}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteCustomField(field.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                    title="Delete field"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {customFields.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400">
                  No custom fields configured yet. Add your first field above!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RBAC & Team Management */}
      {activeTab === 'rbac' && (
        <div className="space-y-6">
          {/* Permissions Matrix */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Multi-Tier Role & Scope Permission Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Server-enforced boundaries across 6 organizational tiers. Destructive & export actions require secondary approval confirmation.
                </p>
              </div>

              <button
                id="btn-save-role-permissions"
                onClick={handleSaveRolePermissions}
                disabled={isSavingRoles}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#1F3A5F] text-white hover:bg-[#162A45] text-xs font-bold transition-all shadow-xs self-start sm:self-auto"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingRoles ? 'Saving...' : 'Save Permissions'}</span>
              </button>
            </div>

            {/* Scope Legend Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-800 dark:text-emerald-300">SELF:</span>
                <span className="text-slate-500">Own leads only</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-bold text-blue-800 dark:text-blue-300">TEAM:</span>
                <span className="text-slate-500">Own branch/team</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="font-bold text-amber-800 dark:text-amber-300">ALL_TEAMS:</span>
                <span className="text-slate-500">All sales teams</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="font-bold text-cyan-800 dark:text-cyan-300">SYSTEM:</span>
                <span className="text-slate-500">Accounts & IT</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="font-bold text-purple-800 dark:text-purple-300">COMPANY:</span>
                <span className="text-slate-500">Full organization</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 w-48">Role & Tier</th>
                    <th className="p-3 w-36">View Scope</th>
                    <th className="p-3">Permitted Actions</th>
                    <th className="p-3 w-48">Approval Gated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rolePermissions.map((rp) => {
                    const roleTitle =
                      rp.role === 'owner' ? 'Owner / Founder' :
                      rp.role === 'cto' ? 'Chief Technology Officer' :
                      rp.role === 'it' ? 'IT Administrator' :
                      rp.role === 'tl_head' ? 'TL Head (Cross-Team)' :
                      rp.role === 'tl' ? 'Team Lead (Branch)' :
                      'Telecaller';

                    const scopeBadgeColor =
                      rp.scope === 'COMPANY' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' :
                      rp.scope === 'SYSTEM' ? 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800' :
                      rp.scope === 'ALL_TEAMS' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' :
                      rp.scope === 'TEAM' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';

                    return (
                      <tr key={rp.role} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 align-top">
                        <td className="p-3 font-medium">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 uppercase">
                              {rp.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                            {roleTitle}
                          </div>
                        </td>

                        <td className="p-3">
                          <select
                            value={rp.scope}
                            onChange={(e) => handleChangeScope(rp.role, e.target.value as ViewScope)}
                            className={`px-2 py-1 rounded-md text-[11px] font-bold border ${scopeBadgeColor} bg-white dark:bg-slate-900 cursor-pointer`}
                          >
                            <option value="SELF">SELF</option>
                            <option value="TEAM">TEAM</option>
                            <option value="ALL_TEAMS">ALL_TEAMS</option>
                            <option value="SYSTEM">SYSTEM</option>
                            <option value="COMPANY">COMPANY</option>
                          </select>
                        </td>

                        <td className="p-3 m3-select">
                          <div className="flex flex-wrap gap-1.5">
                            {ALL_AVAILABLE_ACTIONS.map((act) => {
                              const isPermitted = rp.actions.includes(act.id);
                              return (
                                <button
                                  key={act.id}
                                  type="button"
                                  onClick={() => handleToggleAction(rp.role, act.id)}
                                  title={`${act.label}: ${act.description}`}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                    isPermitted
                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                                  }`}
                                >
                                  {isPermitted ? `✓ ${act.short}` : `+ ${act.short}`}
                                </button>
                              );
                            })}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {rp.actions.map((actId) => {
                              const isApprovalRequired = (rp.requiresApproval || []).includes(actId);
                              if (!isApprovalRequired) return null;
                              return (
                                <span
                                  key={actId}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700"
                                >
                                  <ShieldAlert className="w-2.5 h-2.5 text-amber-600" />
                                  <span>{actId} (202 Gated)</span>
                                </span>
                              );
                            })}
                            {(!rp.requiresApproval || rp.requiresApproval.length === 0) && (
                              <span className="text-[11px] text-slate-400">None (direct)</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Team Members List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Registered Team Personnel & Credentials
                </h3>
                <p className="text-[11px] text-slate-500">Manage user personas, team assignments, and security roles</p>
              </div>

              <button
                onClick={() => setIsAddingUser(!isAddingUser)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#2E6E5C] text-white hover:bg-[#255e4e] flex items-center space-x-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAddingUser ? 'Close Form' : 'Add Team Member'}</span>
              </button>
            </div>

            {isAddingUser && (
              <form onSubmit={handleAddUser} className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patel"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. ramesh@dialpulse.in"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Assigned Role *</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-1.5 text-xs font-semibold m3-select"
                    >
                      <option value="telecaller">Telecaller (SELF Scope)</option>
                      <option value="tl">Team Lead (TEAM Scope)</option>
                      <option value="tl_head">TL Head (ALL_TEAMS Scope)</option>
                      <option value="it">IT Admin (SYSTEM Scope)</option>
                      <option value="owner">Owner (COMPANY Scope)</option>
                      <option value="cto">CTO (COMPANY Scope)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {(newUserRole === 'telecaller' || newUserRole === 'tl') && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Branch Team Location *</label>
                      <select
                        value={newUserTeamId}
                        onChange={(e) => setNewUserTeamId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-semibold m3-select"
                      >
                        <option value="team-mumbai">Team Mumbai (Western Region)</option>
                        <option value="team-delhi">Team Delhi (Northern Region)</option>
                      </select>
                    </div>
                  )}

                  {newUserRole === 'tl_head' && (
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Supervised Teams *</label>
                      <div className="flex items-center space-x-4 mt-1 text-xs">
                        <label className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            checked={newUserManagesTeams.includes('team-mumbai')}
                            onChange={(e) => {
                              if (e.target.checked) setNewUserManagesTeams(prev => [...prev, 'team-mumbai']);
                              else setNewUserManagesTeams(prev => prev.filter(t => t !== 'team-mumbai'));
                            }}
                            className="rounded text-[#2E6E5C]"
                          />
                          <span>Team Mumbai</span>
                        </label>
                        <label className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            checked={newUserManagesTeams.includes('team-delhi')}
                            onChange={(e) => {
                              if (e.target.checked) setNewUserManagesTeams(prev => [...prev, 'team-delhi']);
                              else setNewUserManagesTeams(prev => prev.filter(t => t !== 'team-delhi'));
                            }}
                            className="rounded text-[#2E6E5C]"
                          />
                          <span>Team Delhi</span>
                        </label>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Initial Password (Optional)</label>
                    <input
                      type="password"
                      placeholder="Min 8 characters (auto if blank)"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex items-end space-x-2">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 bg-[#1F3A5F] text-white rounded-xl text-xs font-bold hover:bg-[#162A45] shadow-xs"
                    >
                      Register Personnel
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingUser(false)}
                      className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">User / Identity</th>
                    <th className="p-3">Email & Contact</th>
                    <th className="p-3">Branch / Location</th>
                    <th className="p-3">Role & Scope</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.map((u) => {
                    const roleBadgeClass =
                      u.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300' :
                      u.role === 'cto' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300' :
                      u.role === 'it' ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300' :
                      u.role === 'tl_head' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300' :
                      u.role === 'tl' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300' :
                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300';

                    const roleDisplayName =
                      u.role === 'owner' ? 'Owner' :
                      u.role === 'cto' ? 'CTO' :
                      u.role === 'it' ? 'IT Admin' :
                      u.role === 'tl_head' ? 'TL Head' :
                      u.role === 'tl' ? 'Team Lead' :
                      'Telecaller';

                    const teamLabel =
                      u.role === 'tl_head' ? 'Mumbai & Delhi' :
                      u.teamId === 'team-mumbai' ? 'Team Mumbai' :
                      u.teamId === 'team-delhi' ? 'Team Delhi' :
                      (u.role === 'owner' || u.role === 'cto' || u.role === 'it') ? 'HQ / Global' :
                      'Unassigned';

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-medium text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-[#1F3A5F] text-white font-bold flex items-center justify-center text-xs">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold">{u.name}</div>
                            <div className="text-[10px] text-slate-400">{u.title || roleDisplayName}</div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-slate-600 dark:text-slate-400">{u.email}</div>
                          {u.phone && <div className="text-[10px] text-slate-400">{u.phone}</div>}
                        </td>
                        <td className="p-3">
                          <span className="font-medium px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {teamLabel}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-bold px-2 py-0.5 rounded-md border text-[10px] ${roleBadgeClass}`}>
                            {roleDisplayName} ({u.role})
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Automated Data Backups */}
      {activeTab === 'backups' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Automated Database Snapshot Service
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hourly automated snapshots maintain disaster recovery checkpoints for leads, calls, WhatsApp threads, tickets, and pipeline configurations.
              </p>
            </div>

            <button
              id="btn-create-backup-snapshot"
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2E6E5C] text-white hover:bg-[#255e4e] disabled:opacity-50 transition-colors shadow-xs flex items-center space-x-1.5"
            >
              <HardDrive className="w-4 h-4" />
              <span>{isCreatingBackup ? 'Saving Snapshot...' : 'Create Instant Backup'}</span>
            </button>
          </div>

          {/* Backup Snapshots Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Available Snapshot Versions
              </span>
              <span className="text-xs text-emerald-600 font-semibold">
                Auto-Backups Active (Hourly)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Snapshot Name</th>
                    <th className="p-3">Created Date & Time</th>
                    <th className="p-3">Stored Records</th>
                    <th className="p-3">Size (KB)</th>
                    <th className="p-3">Type</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        {b.name}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(b.timestamp).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {b.recordsCount.leads} leads • {b.recordsCount.calls} calls • {b.recordsCount.messages} msgs
                      </td>
                      <td className="p-3 font-mono">{b.fileSizeKb} KB</td>
                      <td className="p-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          b.autoCreated
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200'
                            : 'bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border-teal-200'
                        }`}>
                          {b.autoCreated ? 'Auto-Snapshot' : 'Manual Snapshot'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleRestoreBackup(b.id)}
                          className="px-2.5 py-1 text-xs font-bold text-[#1F3A5F] dark:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Comprehensive Audit Log System */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter audit log by action or user..."
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredLogs.length} audit entries
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Action Event</th>
                    <th className="p-3">Triggered By</th>
                    <th className="p-3">Role & Scope</th>
                    <th className="p-3">Audit Details</th>
                    <th className="p-3">Origin IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="font-mono font-bold text-[11px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded border border-teal-200/60">
                            {log.action}
                          </span>
                          {log.actionType && (
                            <span className="font-mono font-bold text-[9px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {log.actionType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {log.userName}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{log.userRole}</span>
                          {log.scope && (
                            <span className="text-[9px] font-bold px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              {log.scope}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 max-w-md">
                        <div className="flex items-start space-x-1.5">
                          {log.requiredApproval && (
                            <span className="inline-flex items-center space-x-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 whitespace-nowrap">
                              <ShieldAlert className="w-2.5 h-2.5" />
                              <span>202 Accepted</span>
                            </span>
                          )}
                          <span>{log.details}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
