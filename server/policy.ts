import { Request, Response, NextFunction } from 'express';
import { SecurityContext, Action, RolePermission } from '../src/types';
import { getLegacyState } from './repositories';

// Temporary mapping for Phase 2 Dual-Execution
const actionMap: Record<Action, Action> = {
  'users:create': 'MANAGE_USERS',
  'users:impersonate_tenant': 'PLATFORM_IMPERSONATE',
  'leads:read': 'VIEW',
  'leads:create': 'EDIT',
  'leads:update': 'EDIT',
  'leads:reassign': 'REASSIGN',
  'leads:export': 'EXPORT',
  'leads:delete': 'DELETE',
  'leads:import': 'EDIT',
  'calls:read': 'VIEW',
  'calls:create': 'EDIT',
  'messages:create': 'EDIT',
  'compliance:update': 'MANAGE_COMPLIANCE_RULES',
  'platform:manage': 'PLATFORM_ADMIN',
  
  // Identity mappings for backward compatibility
  'VIEW': 'VIEW',
  'EDIT': 'EDIT',
  'REASSIGN': 'REASSIGN',
  'EXPORT': 'EXPORT',
  'DELETE': 'DELETE',
  'MANAGE_USERS': 'MANAGE_USERS',
  'MANAGE_POLICY': 'MANAGE_POLICY',
  'MANAGE_COMPLIANCE_RULES': 'MANAGE_COMPLIANCE_RULES',
  'PLATFORM_ADMIN': 'PLATFORM_ADMIN',
  'PLATFORM_IMPERSONATE': 'PLATFORM_IMPERSONATE'
};

async function getRolePermission(role: string): Promise<RolePermission | undefined> {
  const db = await getLegacyState();
  const perms = db.rolePermissions || [];
  return perms.find(p => p.role === role);
}

export async function can(
  context: SecurityContext,
  action: Action,
  resource: { tenantId?: string; teamId?: string; ownerId?: string } = {}
): Promise<boolean> {
  let normalizedRole = context.actorRole as string;
  if (normalizedRole === 'Admin') normalizedRole = 'owner';
  else if (normalizedRole === 'Team Lead') normalizedRole = 'tl';
  else if (normalizedRole === 'Rep') normalizedRole = 'telecaller';

  const perm = await getRolePermission(normalizedRole);
  const legacyAction = actionMap[action];

  if (!perm || !perm.actions.includes(legacyAction)) {
    return false;
  }

  // 1. PLATFORM Scope
  if (perm.scope === 'PLATFORM' || context.isPlatformStaff) {
    if (['PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE'].includes(legacyAction)) {
      return true;
    }
    // Impersonating platform staff acts with full tenant access for the impersonated tenant
    if (context.impersonating && context.tenantId) {
      if (resource.tenantId && resource.tenantId !== context.tenantId) return false;
      return true; // Impersonator has full access to the tenant they impersonate
    }
    // Non-impersonating platform staff
    if (!resource.tenantId) {
      return true;
    }
    return true; 
  }

  // 2. Strict Tenant Boundary Check
  if (resource.tenantId && context.tenantId) {
    if (resource.tenantId !== context.tenantId) {
      return false;
    }
  }

  // 3. Intra-tenant Hierarchical Scope Check
  switch (perm.scope) {
    case 'SELF':
      return resource.ownerId === context.actorUserId;
    case 'TEAM':
      return Boolean(context.actorTeamId && resource.teamId === context.actorTeamId);
    case 'ALL_TEAMS':
      return Boolean(resource.teamId && context.actorManagesTeamIds?.includes(resource.teamId));
    case 'SYSTEM':
    case 'COMPANY':
      return true; // Tenant isolation already verified above
    default:
      return false;
  }
}

// Express Middleware for Policy Enforcement
export function requirePolicy(
  action: Action, 
  getResource?: (req: Request) => Promise<{ tenantId?: string; teamId?: string; ownerId?: string } | undefined>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.securityContext) {
      return res.status(401).json({ error: 'Security context missing', code: 'UNAUTHORIZED' });
    }

    try {
      const resource = getResource ? await getResource(req) : {};
      
      const allowed = await can(req.securityContext, action, resource || {});
      
      if (!allowed) {
        return res.status(403).json({
          error: `Forbidden: Current role '${req.securityContext.actorRole}' lacks permission to perform '${action}'.`,
          code: 'FORBIDDEN',
          userRole: req.securityContext.actorRole
        });
      }

      next();
    } catch (err) {
      console.error('[requirePolicy] Error:', err);
      return res.status(500).json({ error: 'Internal server error during authorization', code: 'INTERNAL_ERROR' });
    }
  };
}
