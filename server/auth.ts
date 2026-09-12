import express from 'express';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { UserRole, RolePermission, User, ViewScope, Action } from '../src/types';
import { getDb, DEFAULT_ROLE_PERMISSIONS } from './db';

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
export const JWT_EXPIRY = parseJwtExpiry(process.env.JWT_EXPIRY);

// In-memory revocation registry for active session invalidation / logout
export const revokedTokens = new Set<string>();

export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

// Password Hashing Helpers
export function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcryptjs.compareSync(password, hash);
}

// Token Generation
export function signAccessToken(user: { id: string; email: string; role: UserRole }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: crypto.randomUUID()
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY as any }
  );
}

export function signRefreshToken(user: { id: string; email: string }): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      type: 'refresh',
      jti: crypto.randomUUID()
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Centralized RBAC Role Permission Resolver
export function getRolePermission(role: string): RolePermission | undefined {
  const db = getDb();
  const perms = db.rolePermissions || DEFAULT_ROLE_PERMISSIONS;
  return perms.find(p => p.role === role) || DEFAULT_ROLE_PERMISSIONS.find(p => p.role === role);
}

// Centralized Authorization Function (Step 3)
export function authorize(
  user: User,
  action: Action,
  targetScope: { teamId?: string; ownerId?: string } = {}
): boolean {
  // Normalize legacy roles if needed
  let normalizedRole = user.role;
  if (normalizedRole === ('Admin' as any)) normalizedRole = 'owner';
  else if (normalizedRole === ('Team Lead' as any)) normalizedRole = 'tl';
  else if (normalizedRole === ('Rep' as any)) normalizedRole = 'telecaller';

  const perm = getRolePermission(normalizedRole);
  if (!perm || !perm.actions.includes(action)) return false;

  switch (perm.scope) {
    case 'SELF':
      return targetScope.ownerId === user.id;
    case 'TEAM':
      return Boolean(user.teamId && targetScope.teamId === user.teamId);
    case 'ALL_TEAMS':
      return Boolean(targetScope.teamId && user.managesTeamIds?.includes(targetScope.teamId));
    case 'SYSTEM':
    case 'COMPANY':
      return true; // scope passes; action-type check above already gated this
    default:
      return false;
  }
}

// Approval Gating Checker (Step 5)
export function actionRequiresApproval(user: User, action: Action): boolean {
  let normalizedRole = user.role;
  if (normalizedRole === ('Admin' as any)) normalizedRole = 'owner';
  else if (normalizedRole === ('Team Lead' as any)) normalizedRole = 'tl';
  else if (normalizedRole === ('Rep' as any)) normalizedRole = 'telecaller';

  const perm = getRolePermission(normalizedRole);
  return Boolean(perm?.requiresApproval?.includes(action));
}

// Express Authentication Middleware
// Validates JWT tokens in the Authorization header.
// Applied globally to all API routes except /api/auth/login.
export const authenticateToken: express.RequestHandler = (req, res, next) => {
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

  if (isTokenRevoked(token)) {
    return res.status(401).json({
      error: 'Session has been invalidated. Please log in again.',
      code: 'TOKEN_REVOKED'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as {
      id: string;
      email: string;
      role: UserRole;
      type?: string;
    };

    if (decoded.type && decoded.type !== 'access') {
      return res.status(401).json({
        error: 'Invalid token type for API access.',
        code: 'INVALID_TOKEN'
      });
    }

    const db = getDb();
    const user = db.users.find(u => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'User account not found or deactivated.',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = {
      ...user,
      token
    };

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

// Server-side helper to check user permissions against their assigned role
export function checkUserPermission(
  userRole: UserRole | string,
  permission: keyof RolePermission | 'admin' | 'canExportData' | 'canManageSettings' | 'canManageUsers' | 'canViewAllLeads' | 'canManageTemplates' | 'canManagePolicy',
  rolePermissions?: RolePermission[]
): boolean {
  if (userRole === 'owner' || userRole === 'Admin') {
    return true;
  }

  let normalizedRole = userRole;
  if (normalizedRole === 'Team Lead') normalizedRole = 'tl';
  if (normalizedRole === 'Rep') normalizedRole = 'telecaller';

  const perms = rolePermissions || getDb().rolePermissions || DEFAULT_ROLE_PERMISSIONS;
  const userPerm = perms.find(p => p.role === normalizedRole);
  if (!userPerm) {
    return false;
  }

  if (permission === 'admin' || permission === 'canManageSettings' || permission === 'canManagePolicy') {
    return userPerm.actions?.includes('MANAGE_POLICY') ?? false;
  }
  if (permission === 'canManageUsers') {
    return userPerm.actions?.includes('MANAGE_USERS') ?? false;
  }
  if (permission === 'canExportData') {
    return userPerm.actions?.includes('EXPORT') ?? false;
  }
  if (permission === 'canViewAllLeads') {
    return userPerm.scope !== 'SELF';
  }
  if (permission === 'canManageTemplates') {
    return userPerm.actions?.includes('EDIT') ?? false;
  }

  if (permission in userPerm) {
    return Boolean((userPerm as any)[permission]);
  }

  return false;
}

// Middleware: Require specific user permissions
export function requirePermission(permission: keyof RolePermission | 'admin' | 'canExportData' | 'canManageSettings' | 'canManageUsers' | 'canManagePolicy') {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized: User identity not established.',
        code: 'UNAUTHORIZED'
      });
    }

    const hasPermission = checkUserPermission(req.user.role, permission);
    if (!hasPermission) {
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user.role}' lacks the required '${String(permission)}' permission.`,
        code: 'FORBIDDEN',
        requiredPermission: permission,
        userRole: req.user.role
      });
    }

    next();
  };
}

// Middleware: Require specific role(s)
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized: User identity not established.',
        code: 'UNAUTHORIZED'
      });
    }

    let userRole = req.user.role;
    // Map legacy
    const matching = allowedRoles.includes(userRole) ||
      (userRole === 'owner' && (allowedRoles.includes('Admin' as any) || allowedRoles.includes('owner'))) ||
      (userRole === 'cto' && (allowedRoles.includes('Admin' as any) || allowedRoles.includes('cto'))) ||
      (userRole === 'tl' && (allowedRoles.includes('Team Lead' as any) || allowedRoles.includes('tl'))) ||
      (userRole === 'telecaller' && (allowedRoles.includes('Rep' as any) || allowedRoles.includes('telecaller')));

    if (!matching) {
      return res.status(403).json({
        error: `Forbidden: Action requires one of [${allowedRoles.join(', ')}] roles. Current role: ${req.user.role}`,
        code: 'FORBIDDEN'
      });
    }

    next();
  };
}
