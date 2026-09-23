import { RolePermission } from '../../src/types';

export const DEFAULT_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'owner',
    scope: 'COMPANY',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT', 'DELETE', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES', 'PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE'],
    requiresApproval: ['EXPORT'],
    canViewAllLeads: true,
    canExportData: true,
    canManageTemplates: true
  },
  {
    role: 'cto',
    scope: 'COMPANY',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT', 'DELETE', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES', 'PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE'],
    requiresApproval: ['EXPORT'],
    canViewAllLeads: true,
    canExportData: true,
    canManageTemplates: true
  },
  {
    role: 'it',
    scope: 'COMPANY',
    actions: ['VIEW', 'EDIT', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES'],
    requiresApproval: [],
    canViewAllLeads: true,
    canExportData: false,
    canManageTemplates: true
  },
  {
    role: 'tl_head',
    scope: 'ALL_TEAMS',
    actions: ['VIEW', 'EDIT', 'REASSIGN', 'EXPORT'],
    requiresApproval: ['EXPORT'],
    canViewAllLeads: false,
    canExportData: true,
    canManageTemplates: false
  },
  {
    role: 'tl',
    scope: 'TEAM',
    actions: ['VIEW', 'EDIT', 'REASSIGN'],
    requiresApproval: [],
    canViewAllLeads: false,
    canExportData: false,
    canManageTemplates: false
  },
  {
    role: 'telecaller',
    scope: 'SELF',
    actions: ['VIEW', 'EDIT'],
    requiresApproval: [],
    canViewAllLeads: false,
    canExportData: false,
    canManageTemplates: false
  },
  {
    role: 'platform_admin',
    scope: 'PLATFORM',
    actions: ['PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE', 'VIEW', 'EDIT', 'MANAGE_USERS', 'MANAGE_POLICY', 'MANAGE_COMPLIANCE_RULES', 'EXPORT', 'DELETE', 'REASSIGN'],
    requiresApproval: [],
    canViewAllLeads: true,
    canExportData: true,
    canManageTemplates: true
  },
  {
    role: 'platform_support',
    scope: 'PLATFORM',
    actions: ['PLATFORM_IMPERSONATE', 'VIEW'],
    requiresApproval: [],
    canViewAllLeads: false,
    canExportData: false,
    canManageTemplates: false
  },
  {
    role: 'platform_security',
    scope: 'PLATFORM',
    actions: ['PLATFORM_ADMIN', 'VIEW'],
    requiresApproval: [],
    canViewAllLeads: false,
    canExportData: false,
    canManageTemplates: false
  }
];
