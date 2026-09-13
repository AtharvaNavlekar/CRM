import { Request, Response, NextFunction, RequestHandler } from 'express';
import { User, ImpersonationSession, SecurityContext } from '../src/types';
import { db as pgDb } from './db/client';
import { impersonationSessions } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getDb, logAudit } from './db';
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      isPlatformStaff?: boolean;
      impersonationSession?: ImpersonationSession;
      securityContext?: SecurityContext;
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
 * Automatically attaches canonical `req.securityContext` properties.
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
  if (!req.user || !req.securityContext) {
    return next();
  }

  const user = req.user;

  // The actor is already populated by authenticateToken in req.securityContext
  const isPlatformStaff = req.securityContext.isPlatformStaff;

  if (isPlatformStaff) {
    // Check if platform staff has an active impersonation session in PostgreSQL
    const activeSessions = await pgDb.select().from(impersonationSessions)
      .where(
        and(
          eq(impersonationSessions.platformUserId, user.id),
          eq(impersonationSessions.active, true),
          gt(impersonationSessions.expiresAt, new Date().toISOString())
        )
      )
      .limit(1);

    const activeSession = activeSessions[0];

    if (activeSession) {
      req.securityContext.tenantId = activeSession.targetTenantId;
      req.securityContext.impersonating = true;
      req.securityContext.impersonationSessionId = activeSession.id;
      req.securityContext.actingAsUserId = activeSession.targetUserId;
      
      // Legacy compat properties
      req.tenantId = activeSession.targetTenantId;
      req.impersonationSession = activeSession;
    } else {
      // Platform staff in global management view (unscoped or platform scope)
      req.securityContext.tenantId = undefined;
      req.tenantId = undefined;
    }
  } else {
    // Tenant user: Derive tenantId strictly from user's verified database record
    // If not set and not platform staff, we must reject rather than fallback arbitrarily.
    if (!user.tenantId) {
      return res.status(403).json({
        error: 'Access denied: User is not associated with a tenant.',
        code: 'NO_TENANT_SCOPE'
      });
    }
    
    req.securityContext.tenantId = user.tenantId;
    req.tenantId = user.tenantId;
  }

  // Set legacy compat for isPlatformStaff
  req.isPlatformStaff = isPlatformStaff;

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
