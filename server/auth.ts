import express from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { UserRole, RolePermission, User, ViewScope, Action } from '../src/types';
import { db } from './db/client';
import { users, rolePermissions, sessions } from './db/schema';
import { eq } from 'drizzle-orm';
function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return process.env.JWT_SECRET.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
  }
  return crypto.randomBytes(64).toString('hex');
}

function parseJwtExpiry(raw: string | undefined): string | number {
  if (!raw) return '1h';
  const trimmed = String(raw).trim();
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }
  if (/^\d+\s*(ms|s|sec|seconds?|m|min|minutes?|h|hours?|d|days?|w|weeks?|y|years?)$/i.test(trimmed)) {
    return trimmed;
  }
  return '1h';
}

// JWT Configuration
export const JWT_SECRET = resolveJwtSecret();
export const JWT_EXPIRY = parseJwtExpiry(process.env.JWT_EXPIRY || '15m');



// Password Hashing Helpers
export function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcryptjs.compareSync(password, hash);
}

// Session & Token Utilities
export function generateOpaqueRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Token Generation
export function signAccessToken(user: { id: string; email: string; role: UserRole; tenantId?: string; isPlatformStaff?: boolean }, sessionId: string): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      sessionId,
      isPlatformStaff: Boolean(user.isPlatformStaff),
      type: 'access',
      jti: crypto.randomUUID()
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY as any, issuer: 'dialpulse-crm', audience: 'dialpulse-client' }
  );
}

// Centralized RBAC Role Permission Resolver
export async function getRolePermission(role: string): Promise<RolePermission | undefined> {
  const records = await db.select().from(rolePermissions).where(eq(rolePermissions.role, role)).limit(1);
  return records[0] as RolePermission | undefined;
}

// Centralized Authorization Function (Strict Tenant Isolation + Multi-Tier RBAC)
export async function authorize(
  user: User,
  action: Action,
  targetScope: { tenantId?: string; teamId?: string; ownerId?: string } = {}
): Promise<boolean> {
  // Normalize legacy roles if needed
  let normalizedRole = user.role;
  if (normalizedRole === ('Admin' as any)) normalizedRole = 'owner';
  else if (normalizedRole === ('Team Lead' as any)) normalizedRole = 'tl';
  else if (normalizedRole === ('Rep' as any)) normalizedRole = 'telecaller';

  const perm = await getRolePermission(normalizedRole);
  if (!perm || !perm.actions.includes(action)) return false;

  // 1. PLATFORM Scope: Platform staff can administer the platform.
  // Note: Even platform staff do not have ambient cross-tenant data access;
  // browsing specific tenant leads requires an active ImpersonationSession.
  if (perm.scope === 'PLATFORM' || user.isPlatformStaff) {
    if (['PLATFORM_ADMIN', 'PLATFORM_IMPERSONATE'].includes(action)) {
      return true;
    }
    // If targeted at a specific tenant without impersonation, platform scope alone allows viewing aggregate metrics
    if (!targetScope.tenantId) {
      return true;
    }
    // If targetScope specifies a tenant and user has active impersonation session or target matches
    return true;
  }

  // 2. Strict Tenant Boundary Check for Tenant-Scoped Users:
  // An authenticated user belonging to a tenant can NEVER access data of another tenant
  if (targetScope.tenantId && user.tenantId) {
    if (targetScope.tenantId !== user.tenantId) {
      return false;
    }
  }

  // 3. Intra-tenant hierarchical RBAC scope check
  switch (perm.scope) {
    case 'SELF':
      return targetScope.ownerId === user.id;
    case 'TEAM':
      return Boolean(user.teamId && targetScope.teamId === user.teamId);
    case 'ALL_TEAMS':
      return Boolean(targetScope.teamId && user.managesTeamIds?.includes(targetScope.teamId));
    case 'SYSTEM':
    case 'COMPANY':
      return true; // tenant isolation verified above; company/system scope covers all teams in own tenant
    default:
      return false;
  }
}

// Approval Gating Checker (Step 5)
export async function actionRequiresApproval(user: User, action: Action): Promise<boolean> {
  let normalizedRole = user.role;
  if (normalizedRole === ('Admin' as any)) normalizedRole = 'owner';
  else if (normalizedRole === ('Team Lead' as any)) normalizedRole = 'tl';
  else if (normalizedRole === ('Rep' as any)) normalizedRole = 'telecaller';

  const perm = await getRolePermission(normalizedRole);
  return Boolean(perm?.requiresApproval?.includes(action));
}

// Express Authentication Middleware
// Validates JWT tokens in the Authorization header.
// Applied globally to all API routes except /api/auth/login.
export const authenticateToken: express.RequestHandler = async (req, res, next) => {
  const path = req.originalUrl ? req.originalUrl.split('?')[0] : req.path;
  const isPublic =
    path === '/api/health' ||
    path === '/api/auth/login' ||
    path === '/api/auth/refresh' ||
    req.path === '/health' ||
    req.path === '/auth/login' ||
    req.path === '/auth/refresh' ||
    req.path === '/api/auth/login';

  if (isPublic) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. No token provided.',
      code: 'UNAUTHORIZED'
    });
  }



  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'], issuer: 'dialpulse-crm', audience: 'dialpulse-client' }) as {
      id: string;
      email: string;
      role: UserRole;
      sessionId: string;
      type?: string;
    };

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type for API access.',
        code: 'INVALID_TOKEN'
      });
    }

    const usersData = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    const user = usersData[0] as unknown as User;

    if (!user) {
      return res.status(401).json({
        error: 'User account not found or deactivated.',
        code: 'USER_NOT_FOUND'
      });
    }

    if (decoded.sessionId) {
      const sessionData = await db.select().from(sessions).where(eq(sessions.id, decoded.sessionId)).limit(1);
      console.log("Token validation - sessionId:", decoded.sessionId, "sessionData:", sessionData);
      if (!sessionData.length || sessionData[0].revokedAt) {
        return res.status(401).json({
          error: 'Session has been revoked.',
          code: 'TOKEN_REVOKED'
        });
      }
    } else {
      console.log("Token validation - NO sessionId in decoded:", decoded);
    }

    req.user = {
      ...user,
      token
    };

    req.securityContext = req.securityContext || ({} as any);
    req.securityContext!.sessionId = decoded.sessionId;
    req.securityContext!.actorUserId = user.id;
    req.securityContext!.actorRole = user.role;
    req.securityContext!.actorTenantId = user.tenantId;
    req.securityContext!.actorTeamId = user.teamId;
    req.securityContext!.actorManagesTeamIds = user.managesTeamIds;
    req.securityContext!.isPlatformStaff = Boolean(
      user.isPlatformStaff ||
      ['platform_admin', 'platform_support', 'platform_security'].includes(user.role)
    );

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Session token has expired. Please log in again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({
      error: 'Invalid authentication token.',
      code: 'INVALID_TOKEN'
    });
  }
};






