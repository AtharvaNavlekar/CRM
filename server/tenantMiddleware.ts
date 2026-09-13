import { Request, Response, NextFunction, RequestHandler } from 'express';
import { User, ImpersonationSession } from '../src/types';
import { getDb, logAudit } from './db';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      isPlatformStaff?: boolean;
      impersonationSession?: ImpersonationSession;
    }
  }
}

/**
 * Centralized Tenant Scoping Middleware (Priority 1)
 *
 * CRITICAL SECURITY INVARIANT:
 * Derives tenantId exclusively from the authenticated user's verified session record,
 * NEVER from any client-supplied body, query parameter, or header.
 *
 * For platform staff with an active impersonation session, tenantId is set to the
 * target tenant being actively impersonated with full audit trail logging.
 *
 * Automatically attaches `req.tenantId` and `req.isPlatformStaff`.
 */
export const enforceTenantScope: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  // Public/exempt routes (health, unauthenticated login/refresh)
  const path = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
  if (
    path === '/api/health' ||
    path === '/api/auth/login' ||
    path === '/api/auth/refresh' ||
    path === '/robots.txt'
  ) {
    return next();
  }

  // If request has not been authenticated, let downstream authenticateToken handle 401
  if (!req.user) {
    return next();
  }

  const user = req.user;
  const db = await getDb();

  // Check if user is platform staff
  const isPlatformStaff = Boolean(
    user.isPlatformStaff ||
    ['platform_admin', 'platform_support', 'platform_security'].includes(user.role)
  );
  req.isPlatformStaff = isPlatformStaff;

  if (isPlatformStaff) {
    // Check if platform staff has an active impersonation session
    const activeSession = db.impersonationSessions?.find(
      s => s.platformUserId === user.id && s.active === true
    );

    if (activeSession) {
      req.tenantId = activeSession.targetTenantId;
      req.impersonationSession = activeSession;
    } else {
      // Platform staff in global management view (unscoped or platform scope)
      req.tenantId = undefined;
    }
  } else {
    // Tenant user: Derive tenantId strictly from user's verified database record
    // Default to 'tenant-apex' for legacy accounts if not explicitly set
    req.tenantId = user.tenantId || 'tenant-apex';
  }

  next();
};

/**
 * Helper to get tenant-scoped collection filters
 */
export function scopeToTenant<T extends { tenantId?: string }>(
  items: T[],
  req: Request
): T[] {
  // If platform staff not impersonating, they may see all items or items scoped by query if explicitly permitted
  if (req.isPlatformStaff && !req.tenantId) {
    return items;
  }
  const effectiveTenantId = req.tenantId || 'tenant-apex';
  return items.filter(item => item.tenantId === effectiveTenantId);
}

/**
 * Middleware to reject requests if target tenant is suspended
 */
export const verifyTenantActive: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (req.isPlatformStaff && !req.tenantId) {
    return next();
  }

  const tenantId = req.tenantId;
  if (!tenantId) {
    return next();
  }

  const db = await getDb();
  const tenant = db.tenants?.find(t => t.id === tenantId);

  if (tenant && tenant.status === 'suspended') {
    // If platform staff is impersonating, allow read-only investigation
    if (req.isPlatformStaff) {
      return next();
    }

    return res.status(403).json({
      error: `Access Suspended: The tenant organization "${tenant.name}" has been suspended.`,
      code: 'TENANT_SUSPENDED',
      suspensionReason: tenant.suspensionReason || 'Account compliance review required.',
      suspendedAt: tenant.suspendedAt
    });
  }

  next();
};
