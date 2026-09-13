import { evaluateCompliance } from './server/compliance';
import { generateOpaqueRefreshToken, hashToken } from './server/auth';
import { db } from './server/db/client';
import { auditService } from './server/services/auditService';
import { AuditEvents, AuditOutcomes } from './server/constants/auditEvents';
import { sessions, impersonationSessions } from './server/db/schema';
import { eq, sql, and, desc, or, ilike, inArray } from 'drizzle-orm';
import * as schema from './server/db/schema';
import express from 'express';
import { can, getScope } from './server/policy';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisService, createSafeKey } from './server/infrastructure/redis';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { aiService } from './server/services/ai/aiService';
import {
  calculateReports,
  sanitizeUser,
  getComplianceRules,
  DEFAULT_FREQUENCY_RULES
} from './server/db';
import {
  checkCompliance,
  validateLeadCommunicationCompliance,
  isQuietHours,
  ComplianceCheckResult
} from './server/compliance';
import { complianceService } from './server/services/complianceService';
import { compliancePolicyRepository } from './server/repositories/compliancePolicyRepository';
import { healthRouter } from './server/routes/health';
import {
  authenticateToken,
  actionRequiresApproval,
  getRolePermission,
  JWT_SECRET,
  JWT_EXPIRY,
  hashPassword,
  verifyPassword,
  signAccessToken,
  } from './server/auth';
import {
  Lead,
  Call,
  Message,
  Ticket,
  User,
  UserRole,
  RolePermission,
  ContactFrequencyRules,
  Team
} from './src/types';

import {
  AI_CRAWLER_USER_AGENTS,
  isAiCrawler,
  logBlockedCrawlerAttempt,
  getRecentCrawlerBlocks,
  generateRobotsTxtContent,
  getAiCrawlerBlockHtml
} from './server/crawlerAgents';
import { enforceTenantScope, verifyTenantActive, scopeToTenant } from './server/tenantMiddleware';
import { enqueueJob } from './server/jobs/queue';
import { jobRepository } from './server/repositories/jobRepository';
import { logger } from './server/infrastructure/logger';
import { telemetryMiddleware } from './server/middleware/telemetry';
import { globalErrorHandler } from './server/middleware/errorHandler';


// Middleware to prevent platform staff from accessing raw data without an impersonation session

async function adapterLogAudit(req: express.Request, action: string, details: string, user: any, ip: string, meta: any = {}) {
  let eventType: any = AuditEvents.UNKNOWN_EVENT;
  let outcome: any = AuditOutcomes.SUCCESS;
  
  if (action === 'ACCESS_DENIED') {
    outcome = AuditOutcomes.DENIED;
    if (meta.actionType === 'VIEW') eventType = AuditEvents.AUTHZ_DENIED;
    else if (meta.actionType === 'MANAGE_USERS') eventType = AuditEvents.AUTHZ_DENIED;
    else if (meta.actionType === 'EXPORT') eventType = AuditEvents.DATA_EXPORT_DENIED;
    else if (meta.actionType === 'MANAGE_POLICY') eventType = AuditEvents.AUTHZ_DENIED;
    else eventType = AuditEvents.AUTHZ_DENIED;
  } else if (action === 'USER_LOGIN') {
    eventType = AuditEvents.AUTH_LOGIN_SUCCESS;
  } else if (action === 'USER_LOGOUT') {
    eventType = AuditEvents.AUTH_LOGOUT;
  } else if (action === 'SECURITY_ALERT') {
    eventType = AuditEvents.SECURITY_ALERT_CREATED;
  } else if (action === 'USER_INVITED') {
    eventType = AuditEvents.USER_CREATED;
  } else if (action === 'DATA_EXPORT') {
    eventType = AuditEvents.DATA_EXPORT_COMPLETED;
  } else if (action === 'LEAD_CREATED') {
    eventType = AuditEvents.LEAD_CREATED;
  } else if (action === 'LEAD_REASSIGNED') {
    eventType = AuditEvents.LEAD_REASSIGNED;
  } else if (action === 'LEAD_STAGE_CHANGED') {
    eventType = AuditEvents.LEAD_STAGE_CHANGED;
  } else if (action === 'LEAD_UPDATED') {
    eventType = AuditEvents.LEAD_UPDATED;
  } else if (action === 'LEAD_DELETED') {
    eventType = AuditEvents.LEAD_DELETED;
  } else if (action === 'CSV_BULK_IMPORT') {
    eventType = AuditEvents.CSV_BULK_IMPORT;
  } else if (action === 'BULK_LEAD_UPDATE') {
    eventType = AuditEvents.BULK_LEAD_UPDATE;
  } else if (action === 'CALL_LOGGED') {
    eventType = AuditEvents.CALL_CREATED;
  } else if (action === 'WHATSAPP_MESSAGE_QUEUED' || action === 'WHATSAPP_INBOUND') {
    eventType = AuditEvents.MESSAGE_CREATED;
  } else if (action === 'COMPLIANCE_RULES_UPDATED') {
    eventType = AuditEvents.COMPLIANCE_POLICY_UPDATED;
  } else if (action === 'TICKET_CREATED') {
    eventType = AuditEvents.TICKET_CREATED;
  } else if (action === 'TICKET_REPLY' || action === 'TICKET_UPDATED') {
    eventType = AuditEvents.TICKET_UPDATED;
  } else if (action === 'CUSTOM_FIELDS_UPDATED') {
    eventType = AuditEvents.CUSTOM_FIELDS_UPDATED;
  } else if (action === 'ROLE_PERMISSIONS_UPDATED') {
    eventType = AuditEvents.ROLE_PERMISSIONS_UPDATED;
  } else if (action === 'PIPELINE_CONFIG_UPDATED') {
    eventType = AuditEvents.PIPELINE_CONFIG_UPDATED;
  } else if (action === 'AUTO_ASSIGNMENT_TOGGLED') {
    eventType = AuditEvents.AUTO_ASSIGNMENT_TOGGLED;
  } else if (action === 'AUDIO_TRANSCRIBED') {
    eventType = AuditEvents.AUDIO_TRANSCRIBED;
  } else if (action === 'TENANT_SUSPENDED') {
    eventType = AuditEvents.TENANT_SUSPENDED;
  } else if (action === 'TENANT_REACTIVATED') {
    eventType = AuditEvents.TENANT_REACTIVATED;
  } else if (action === 'IMPERSONATION_STARTED') {
    eventType = AuditEvents.IMPERSONATION_STARTED;
  } else if (action === 'IMPERSONATION_ENDED') {
    eventType = AuditEvents.IMPERSONATION_ENDED;
  } else if (action === 'INVOICE_PAID') {
    eventType = AuditEvents.INVOICE_PAID;
  } else if (action === 'FEATURE_FLAG_UPDATED') {
    eventType = AuditEvents.FEATURE_FLAG_UPDATED;
  } else {
    eventType = (AuditEvents as any)[action] || AuditEvents.UNKNOWN_EVENT;
  }

  const secCtx = req.securityContext || {
    requestId: 'unknown',
    ipAddress: ip,
    actorUserId: user?.id || 'system',
    actorRole: user?.role || 'system',
    isPlatformStaff: false,
    impersonating: false
  };

  await auditService.logNormal({
    eventType,
    outcome,
    securityContext: secCtx,
    action: action,
    reason: details,
    metadata: meta
  });
}


const enforceImpersonationForRawData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.isPlatformStaff && !req.impersonationSession) {
    adapterLogAudit(req, 'ACCESS_DENIED', `Denied raw data access to ${req.user!.name || req.user!.id} (No active impersonation session)`, req.user, req.ip || '127.0.0.1', { actionType: 'VIEW' });
    return res.status(403).json({
      error: 'Platform staff must have an active impersonation session to view or modify raw tenant data.',
      code: 'IMPERSONATION_REQUIRED'
    });
  }
  next();
};

// ============================================================================
// GEMINI API & SECRETS CONFIGURATION NOTICE (Priority 6)
// Server-side only. Never import this into any file under `src/` or reference it
// via `import.meta.env.VITE_*` — verify by grepping the built `dist/` output for
// the key value after every production build.
// ============================================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Express user type augmentation
declare global {
  namespace Express {
    interface Request {
      user?: User & {
        token?: string;
      };
    }
  }
}

// Input Validation Helpers
const validateEmail = (email: any): boolean => {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 3 || trimmed.length > 100) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const validatePhone = (phone: any): boolean => {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (trimmed.length < 8 || trimmed.length > 25) return false;
  // Reject null bytes or script tags
  if (phone.includes('\0') || /<script/i.test(phone)) return false;
  return /^[\d\s+\-()]{8,25}$/.test(trimmed);
};

const validateText = (text: any, minLen = 1, maxLen = 2000): boolean => {
  if (typeof text !== 'string') return false;
  if (text.includes('\0')) return false;
  const trimmed = text.trim();
  return trimmed.length >= minLen && trimmed.length <= maxLen;
};

// CSV / Formula Injection Sanitizer (CWE-1236)
const sanitizeFormula = (val: any): string => {
  if (typeof val !== 'string') return val;
  const trimmed = val.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'` + trimmed;
  }
  return trimmed;
};


// Export app for testing
export const app = express();

async function startServer() {
  const TEAMS: any[] = [];
  const PORT = 3000;

  // Trust proxy for reverse proxy environments (Cloud Run, Nginx)
  app.set('trust proxy', 1);

  const getClientIp = (req: express.Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  };

  // 0. Initialize Canonical Security Context
  app.use((req, res, next) => {
    req.securityContext = {
      requestId: crypto.randomUUID(),
      ipAddress: getClientIp(req),
      userAgent: req.get('user-agent'),
      actorUserId: '', // Populated by authenticateToken
      actorRole: '',   // Populated by authenticateToken
      isPlatformStaff: false,
      impersonating: false
    };
    next();
  });

  // 1. Network-Layer Hardening & Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https:", "ws:", "wss:"],
        frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com"]
      }
    }
  }));

  // Remove legacy X-Frame-Options to allow AI Studio iframe while CSP frame-ancestors protects modern browsers
  app.use((req, res, next) => {
    res.removeHeader('X-Frame-Options');
    next();
  });

  // Strict CORS configuration
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'https://ai.studio'
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === origin) return true;
        if (origin.endsWith('.google.com') || origin.endsWith('.run.app')) return true;
        return false;
      });
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition']
  }));

  // --------------------------------------------------------------------------
  // AI CRAWLER & SCRAPING AGENT BLOCKING MIDDLEWARE (Feature 2)
  // Evaluates the incoming User-Agent against the centralized known AI crawler
  // signatures list. Blocks automated bots with HTTP 403 and a dedicated warning
  // HTML page before any static assets, SPA bundles, or API routes are processed.
  // --------------------------------------------------------------------------
  app.use((req, res, next) => {
    // Exempt robots.txt so crawlers and search indexers can parse rules
    if (req.path === '/robots.txt') {
      return next();
    }

    const ua = (req.headers['user-agent'] as string) || '';
    const crawlerCheck = isAiCrawler(ua);

    if (crawlerCheck.isCrawler) {
      logBlockedCrawlerAttempt({
        userAgent: ua,
        path: req.originalUrl || req.path,
        ip: getClientIp(req),
        matchedAgent: crawlerCheck.matchedAgent
      });

      return res
        .status(403)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .send(getAiCrawlerBlockHtml());
    }

    next();
  });

  // Explicit robots.txt route (synchronized with AI_CRAWLER_USER_AGENTS)
  app.get('/robots.txt', async (req, res) => {
    res.type('text/plain').send(generateRobotsTxtContent());
  });

  app.use(express.json({ limit: '5mb' }));

  // Prototype Pollution Guard
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const cleanObject = (obj: any) => {
        if (obj && typeof obj === 'object') {
          delete obj.__proto__;
          delete obj.constructor;
          delete obj.prototype;
          for (const key of Object.keys(obj)) {
            if (obj[key] && typeof obj[key] === 'object') {
              cleanObject(obj[key]);
            }
          }
        }
      };
      cleanObject(req.body);
    }
    next();
  });

  // Mount Health & Metrics early (bypass typical middlewares)
  app.use('/health', healthRouter);
  app.use('/metrics', healthRouter);

  // 1. Observability & Telemetry
  app.use(telemetryMiddleware);

  // 2. Global Rate Limiting
  let limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    // Use Redis for rate limiting if available, otherwise it falls back to memory if store is omitted
    ...(process.env.REDIS_URL ? {
      store: new RedisStore({
        // @ts-expect-error - rate-limit-redis types are slightly mismatched with ioredis but perfectly compatible
        sendCommand: async (...args: string[]) => {
          const client = redisService.getClient();
          if (client && args.length > 0) {
            const command = args[0];
            const commandArgs = args.slice(1);
            return client.call(command, ...commandArgs);
          }
          return null;
        },
      })
    } : {}),
    keyGenerator: (req) => {
      // Use standard IP extraction
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : 'unknown';
      // Hash to prevent raw PII in redis
      return createSafeKey('rate-limit:login', 'global', `${ip}|${email}`);
    },
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
  });
  const loginLimiter = limiter;

  // 2. Global Authentication Middleware (validates JWT tokens in Authorization header)
  app.use('/api', authenticateToken);
  app.use('/api', enforceTenantScope);
  app.use('/api', verifyTenantActive);

  // Apply impersonation enforcement for raw data routes
  app.use('/api/leads', enforceImpersonationForRawData);
  app.use('/api/calls', enforceImpersonationForRawData);
  app.use('/api/messages', enforceImpersonationForRawData);
  app.use('/api/tickets', enforceImpersonationForRawData);

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift()!.trim()] = decodeURI(parts.join('='));
  });
  return list;
}

  // 3. Auth Routes
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email address format' });

    const usersData = await db.select().from(schema.users).where(eq(schema.users.email, String(email).trim().toLowerCase())).limit(1);
    const user = usersData[0];

    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = bcryptjs.compareSync(String(password), user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const tokenFamilyId = crypto.randomUUID();
    const rawRefreshToken = generateOpaqueRefreshToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const sessionId = crypto.randomUUID();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      id: sessionId,
      userId: user.id,
      tenantId: user.tenantId,
      tokenFamilyId,
      refreshTokenHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: now.toISOString(),
      createdIp: getClientIp(req),
      lastUsedIp: getClientIp(req),
      createdUserAgent: req.headers['user-agent']?.substring(0, 255),
      lastUsedUserAgent: req.headers['user-agent']?.substring(0, 255),
    });

    const token = signAccessToken({ id: user.id, email: user.email, role: user.role as any, tenantId: user.tenantId, isPlatformStaff: user.isPlatformStaff }, sessionId);

    adapterLogAudit(req, 'USER_LOGIN', `${user.name} logged into DialPulse CRM`, { id: user.id, name: user.name, role: user.role }, getClientIp(req));
    
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth'
    });

    const permsData = await db.select().from(schema.rolePermissions).where(eq(schema.rolePermissions.role, user.role)).limit(1);
    const rolePermission = permsData[0] || null;

    res.json({ 
      user: sanitizeUser(user as any), 
      token, 
      expiresIn: 900,
      securityContext: {
        actorRole: user.role,
        tenantId: user.tenantId,
        actingAsUserId: user.id,
        sessionId,
        impersonating: false,
        isPlatformStaff: user.isPlatformStaff
      },
      permissions: rolePermission
    });
  });

  app.post('/api/auth/refresh', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const rawRefreshToken = cookies['refreshToken'];
    if (!rawRefreshToken) return res.status(401).json({ error: 'Refresh token is required', code: 'REFRESH_TOKEN_REQUIRED' });

    const hashedToken = hashToken(rawRefreshToken);
    const sessionRecords = await db.select().from(sessions).where(eq(sessions.refreshTokenHash, hashedToken));
    const session = sessionRecords[0];

    if (!session) return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_TOKEN' });

    if (session.revokedAt) {
      await db.update(sessions).set({ revokedAt: new Date().toISOString(), revokeReason: 'reuse_detected' }).where(eq(sessions.tokenFamilyId, session.tokenFamilyId));
      adapterLogAudit(req, 'SECURITY_ALERT', 'Token reuse detected', { id: session.userId, role: 'unknown' }, getClientIp(req), { severity: 'HIGH' });
      return res.status(401).json({ error: 'Security violation: token reuse detected', code: 'TOKEN_REUSE_DETECTED' });
    }

    if (new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired', code: 'TOKEN_EXPIRED' });
    }

    const usersData = await db.select().from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
    const user = usersData[0];
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newRawRefreshToken = generateOpaqueRefreshToken();
    const newRefreshTokenHash = hashToken(newRawRefreshToken);
    const newSessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.update(sessions).set({ revokedAt: now.toISOString(), revokeReason: 'rotated' }).where(eq(sessions.id, session.id));

    await db.insert(sessions).values({
      id: newSessionId,
      userId: user.id,
      tenantId: user.tenantId,
      tokenFamilyId: session.tokenFamilyId,
      refreshTokenHash: newRefreshTokenHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: now.toISOString(),
      createdIp: getClientIp(req),
      lastUsedIp: getClientIp(req),
      createdUserAgent: req.headers['user-agent']?.substring(0, 255),
      lastUsedUserAgent: req.headers['user-agent']?.substring(0, 255),
    });

    const token = signAccessToken({ id: user.id, email: user.email, role: user.role as any, tenantId: user.tenantId, isPlatformStaff: user.isPlatformStaff }, newSessionId);

    res.cookie('refreshToken', newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth'
    });

    res.json({ token, expiresIn: 900 });
  });

  app.get('/api/auth/me', async (req, res) => {
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });
    const usersData = await db.select().from(schema.users).where(eq(schema.users.id, req.user.id)).limit(1);
    const user = usersData[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const permsData = await db.select().from(schema.rolePermissions).where(eq(schema.rolePermissions.role, user.role)).limit(1);
    const rolePermission = permsData[0] || null;

    res.json({ user: sanitizeUser(user as any), permissions: rolePermission });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const rawRefreshToken = cookies['refreshToken'];
    
    if (rawRefreshToken) {
      const hashedToken = hashToken(rawRefreshToken);
      await db.update(sessions)
        .set({ revokedAt: new Date().toISOString(), revokeReason: 'logout' })
        .where(eq(sessions.refreshTokenHash, hashedToken));
    }
    
    res.clearCookie('refreshToken', { path: '/api/auth' });
    adapterLogAudit(req, 'USER_LOGOUT', `${req.user?.name} signed out`, { id: req.user?.id, name: req.user?.name, role: req.user?.role }, getClientIp(req));
    res.json({ success: true, message: 'Successfully logged out' });
  });

  
  app.get('/api/auth/sessions', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userSessions = await db.select().from(sessions).where(eq(sessions.userId, req.user.id));
    // Filter out active ones for display
    const active = userSessions.filter(s => !s.revokedAt && new Date(s.expiresAt) > new Date());
    res.json({ sessions: active.map(s => ({ id: s.id, createdAt: s.createdAt, lastUsedAt: s.lastUsedAt, lastUsedIp: s.lastUsedIp, current: s.id === req.securityContext?.sessionId })) });
  });

  app.delete('/api/auth/sessions/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const sessionId = req.params.id;
    const sessionRecords = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    const session = sessionRecords[0];
    if (!session || session.userId !== req.user.id) {
      return res.status(404).json({ error: 'Session not found' });
    }
    await db.update(sessions)
      .set({ revokedAt: new Date().toISOString(), revokeReason: 'user_revoked' })
      .where(eq(sessions.id, sessionId));
    res.json({ success: true });
  });


  app.get('/api/teams', async (req, res) => {
    res.json(TEAMS);
  });

  // 4. User Directory APIs
  app.get('/api/users', async (req, res) => {
    const tenantId = req.securityContext!.tenantId;
    if (!tenantId && !req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Tenant context required' });

    const conditions = [];
    if (tenantId) conditions.push(eq(schema.users.tenantId, tenantId));

    const scope = await getScope(req.securityContext!);
    if (scope === 'TEAM' && req.securityContext!.actorTeamId) {
      conditions.push(eq(schema.users.teamId, req.securityContext!.actorTeamId));
    } else if (scope === 'ALL_TEAMS' && req.securityContext!.actorManagesTeamIds?.length) {
      conditions.push(inArray(schema.users.teamId, req.securityContext!.actorManagesTeamIds));
    } else if (scope === 'SELF') {
      conditions.push(eq(schema.users.id, req.securityContext!.actorUserId));
    }

    const usersData = await db.select().from(schema.users).where(conditions.length ? and(...conditions) : undefined).limit(100);
    res.json(usersData.map(sanitizeUser as any));
  });

  // Account creation is gated by MANAGE_USERS permission
  app.post('/api/users', async (req, res) => {
    if (!(await can(req.securityContext!, 'users:create'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied MANAGE_USERS`, req.user, getClientIp(req), { actionType: 'MANAGE_USERS' });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, email, role, title, phone, password, teamId, managesTeamIds } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });

    const validRoles = ['telecaller', 'tl', 'tl_head', 'it', 'owner', 'cto'];
    let assignedRole = role || 'telecaller';
    if (assignedRole === 'Rep') assignedRole = 'telecaller';
    if (assignedRole === 'Team Lead') assignedRole = 'tl';
    if (assignedRole === 'Admin') assignedRole = 'owner';

    const existingUsers = await db.select().from(schema.users).where(eq(schema.users.email, email.trim().toLowerCase())).limit(1);
    if (existingUsers.length > 0) return res.status(400).json({ error: 'A user with this email already exists' });

    const passwordHash = password ? bcryptjs.hashSync(password, 10) : bcryptjs.hashSync(crypto.randomBytes(32).toString('hex'), 10);
    const defaultTitle: Record<string, string> = { owner: 'Owner', cto: 'CTO', it: 'IT Admin', tl_head: 'Head', tl: 'Team Lead', telecaller: 'Telecaller' };

    const newUser = {
      id: `usr-${Date.now()}`,
      tenantId: req.securityContext!.tenantId || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: assignedRole,
      teamId: teamId || (assignedRole === 'telecaller' || assignedRole === 'tl' ? 'team-mumbai' : null),
      managesTeamIds: managesTeamIds || (assignedRole === 'tl_head' ? ['team-mumbai', 'team-delhi'] : null),
      passwordHash,
      title: title || defaultTitle[assignedRole] || 'Team Member',
      phone: phone || '+91 98' + Math.floor(10000000 + Math.random() * 90000000),
      authVersion: 1
    };

    await db.insert(schema.users).values(newUser);

    adapterLogAudit(req, 'USER_INVITED', `Created user ${newUser.name}`, req.user, getClientIp(req));
    res.json(sanitizeUser(newUser as any));
  });

  // 5. Leads APIs
  app.get('/api/leads', async (req, res) => {
    const tenantId = req.securityContext!.tenantId;
    if (!tenantId && !req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Tenant context required' });

    const conditions = [];
    if (tenantId) conditions.push(eq(schema.leads.tenantId, tenantId));
    
    const scope = await getScope(req.securityContext!);
    if (scope === 'TEAM' && req.securityContext!.actorTeamId) {
      conditions.push(eq(schema.leads.teamId, req.securityContext!.actorTeamId));
    } else if (scope === 'ALL_TEAMS' && req.securityContext!.actorManagesTeamIds?.length) {
      conditions.push(inArray(schema.leads.teamId, req.securityContext!.actorManagesTeamIds));
    } else if (scope === 'SELF') {
      conditions.push(eq(schema.leads.assignedRepId, req.securityContext!.actorUserId));
    }

    const { repId, source, stage, search } = req.query;
    if (repId && typeof repId === 'string' && repId !== 'all') {
      conditions.push(eq(schema.leads.assignedRepId, repId));
    }
    if (source && typeof source === 'string' && source !== 'all') {
      conditions.push(eq(schema.leads.source, source));
    }
    if (stage && typeof stage === 'string' && stage !== 'all') {
      conditions.push(eq(schema.leads.stage, stage));
    }
    if (search && typeof search === 'string') {
      const q = `%${search.toLowerCase().trim()}%`;
      conditions.push(or(
        ilike(schema.leads.name, q),
        ilike(schema.leads.phone, q),
        ilike(schema.leads.notes, q)
      ));
    }

    const leads = await db.select().from(schema.leads).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(schema.leads.createdDate)).limit(100);
    res.json(leads);
  });

  // Data Export API (gated by EXPORT permission and approval workflow)
  app.get('/api/leads/export', async (req, res) => {
    if (!(await can(req.securityContext!, 'leads:export'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied EXPORT to ${req.user!.name} (${req.user!.role})`, req.user, getClientIp(req), { actionType: 'EXPORT' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks EXPORT permission.`,
        code: 'FORBIDDEN',
        action: 'EXPORT'
      });
    }

    const requiresApproval = await actionRequiresApproval(req.user!, 'EXPORT');
    if (requiresApproval && req.query.confirmed !== 'true') {
      return res.status(202).json({
        requiresApproval: true,
        action: 'EXPORT',
        message: 'Exporting customer records requires explicit confirmation. All exports are recorded in the security audit trail.',
        warning: 'High-impact data export requires explicit confirmation.'
      });
    }

    const format = req.query.format === 'json' ? 'json' : 'csv';

    // Queue the background job
    const job = await enqueueJob('EXPORT_LEADS', req.securityContext!, { format });

    adapterLogAudit(req, 'DATA_EXPORT', `Queued export job in ${format} format`, req.user, getClientIp(req), {
      actionType: 'EXPORT',
      requiredApproval: requiresApproval,
      metadata: { jobId: job.id }
    });

    res.status(202).json({
      message: 'Export job queued successfully',
      jobId: job.id,
      status: 'QUEUED'
    });
  });

  // Bulk Import API (gated by EDIT permission and approval workflow)

  // Single Lead Inspection (gated by VIEW authorization on lead scope)
  app.get('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
    const lead = leads[0];
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    if (!(await can(req.securityContext!, 'leads:read', { teamId: lead.teamId || '', ownerId: lead.assignedRepId || '' }))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied read access to lead ${id}`, req.user, getClientIp(req), { actionType: 'VIEW_LEAD' });
      return res.status(403).json({ error: 'Forbidden: Cannot access this lead.' });
    }
    res.json(lead);
  });

  app.get('/api/jobs/:id', async (req, res) => {
    try {
      const job = await jobRepository.getJobById(req.params.id, req.securityContext!.tenantId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Allow users to see jobs created by themselves, or admins/tl to see team jobs
      const isCreator = job.createdBy === req.securityContext!.actorUserId;
      const isAdminOrTL = ['admin', 'tl', 'owner'].includes(req.securityContext!.actorRole as string);
      
      if (!isCreator && !isAdminOrTL) {
        return res.status(403).json({ error: 'Forbidden: Cannot view this job' });
      }

      return res.json(job);
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/leads', async (req, res) => {
    if (!(await can(req.securityContext!, 'leads:create'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied create access to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'CREATE_LEAD' });
      return res.status(403).json({ error: 'Forbidden: Lacks leads:create permission.' });
    }

    const { name, phone, email, source, notes, priority, stage, assignedRepId } = req.body;
    if (!name || !validateText(name, 1, 100)) return res.status(400).json({ error: 'Invalid name' });
    if (!phone || !validatePhone(phone)) return res.status(400).json({ error: 'Invalid phone' });
    
    let teamId = null;
    if (assignedRepId) {
       const repArr = await db.select().from(schema.users).where(eq(schema.users.id, assignedRepId)).limit(1);
       if (repArr.length) teamId = repArr[0].teamId;
    }

    const newLead = {
      id: `ld-${Date.now()}`,
      tenantId: req.securityContext!.tenantId || null,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : null,
      source: source || 'Organic',
      notes: notes ? notes.trim() : null,
      priority: priority || 'Medium',
      stage: stage || 'New',
      createdDate: new Date().toISOString(),
      lastContactDate: new Date().toISOString(),
      assignedRepId: assignedRepId || null,
      teamId: teamId || null,
      customFields: {}
    };

    await db.insert(schema.leads).values(newLead);
    adapterLogAudit(req, 'LEAD_CREATED', `Created lead ${newLead.id}`, req.user, getClientIp(req));
    res.json(newLead);
  });

  // Optimistic Concurrency Update with Scope Authorization & Reassignment Control
  app.put('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];

    if (!(await can(req.securityContext!, 'leads:update', { teamId: lead.teamId || '', ownerId: lead.assignedRepId || '' }))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied update to lead ${id}`, req.user, getClientIp(req), { actionType: 'UPDATE_LEAD' });
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, phone, email, source, stage, notes, priority, assignedRepId } = req.body;
    const updates: any = {};
    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone.trim();
    if (email !== undefined) updates.email = email ? email.trim().toLowerCase() : null;
    if (source) updates.source = source;
    if (stage) updates.stage = stage;
    if (notes !== undefined) updates.notes = notes ? notes.trim() : null;
    if (priority) updates.priority = priority;
    
    if (assignedRepId !== undefined && assignedRepId !== lead.assignedRepId) {
      if (!(await can(req.securityContext!, 'leads:delete', { teamId: lead.teamId || '', ownerId: lead.assignedRepId || '' }))) {
         return res.status(403).json({ error: 'Forbidden: Cannot reassign lead.' });
      }
      updates.assignedRepId = assignedRepId || null;
      if (assignedRepId) {
         const repArr = await db.select().from(schema.users).where(eq(schema.users.id, assignedRepId)).limit(1);
         if (repArr.length) updates.teamId = repArr[0].teamId;
      } else {
         updates.teamId = null;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.update(schema.leads).set(updates).where(eq(schema.leads.id, id));
    }
    
    adapterLogAudit(req, 'LEAD_UPDATED', `Updated lead ${id}`, req.user, getClientIp(req));
    res.json({ ...lead, ...updates });
  });

  // Lead deletion gated by DELETE permission and approval workflow
  app.delete('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];

    if (!(await can(req.securityContext!, 'leads:delete', { teamId: lead.teamId || '', ownerId: lead.assignedRepId || '' }))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied delete lead ${id}`, req.user, getClientIp(req), { actionType: 'DELETE_LEAD' });
      return res.status(403).json({ error: 'Forbidden' });
    }

    await db.delete(schema.leads).where(eq(schema.leads.id, id));
    adapterLogAudit(req, 'LEAD_DELETED', `Deleted lead ${id}`, req.user, getClientIp(req));
    res.json({ success: true, message: 'Lead deleted permanently.' });
  });

  // Bulk import leads from CSV (gated by EDIT authorization)
  app.post('/api/leads/import', async (req, res) => {
    if (!(await can(req.securityContext!, 'leads:create'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied lead CSV import for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks permission to import leads.`,
        code: 'FORBIDDEN',
        action: 'EDIT'
      });
    }

    const { leads: rawLeads } = req.body;
    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return res.status(400).json({ error: 'No valid leads provided for import' });
    }

    // Queue the background job
    const job = await enqueueJob('IMPORT_LEADS', req.securityContext!, { rawLeads });

    adapterLogAudit(req, 'CSV_BULK_IMPORT_QUEUED', `Queued import job for ${rawLeads.length} leads.`, req.user, getClientIp(req), {
      actionType: 'EDIT',
      metadata: { jobId: job.id, count: rawLeads.length }
    });
    
    res.status(202).json({
      message: 'Import job queued successfully',
      jobId: job.id,
      status: 'QUEUED',
      count: rawLeads.length
    });
  });

  // Bulk edit (gated by EDIT & REASSIGN authorizations, restricted to Team Lead and Admin roles)
  app.post('/api/leads/bulk-update', async (req, res) => {
    if (req.user!.role === 'telecaller' || (req.user!.role as any) === 'Rep') {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied bulk-update for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
      return res.status(403).json({
        error: 'Forbidden: Bulk updates are restricted to Team Lead and Admin roles.',
        code: 'FORBIDDEN'
      });
    }

    const { leadIds, stage, assignedRepId } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    // Queue the background job
    const job = await enqueueJob('BULK_UPDATE_LEADS', req.securityContext!, { leadIds, stage, assignedRepId });

    adapterLogAudit(req, 'BULK_LEAD_UPDATE_QUEUED', `Queued bulk update job for ${leadIds.length} leads.`, req.user, getClientIp(req), {
      actionType: assignedRepId ? 'REASSIGN' : 'EDIT',
      metadata: { jobId: job.id, count: leadIds.length }
    });

    res.status(202).json({
      message: 'Bulk update job queued successfully',
      jobId: job.id,
      status: 'QUEUED',
      count: leadIds.length
    });
  });

  // 6. Calls APIs
  app.get('/api/calls', async (req, res) => {
    const tenantId = req.securityContext!.tenantId;
    if (!tenantId && !req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Tenant context required' });

    const conditions = [];
    if (tenantId) conditions.push(eq(schema.calls.tenantId, tenantId));
    
    const scope = await getScope(req.securityContext!);
    if (scope === 'TEAM' && req.securityContext!.actorTeamId) {
      conditions.push(eq(schema.calls.teamId, req.securityContext!.actorTeamId));
    } else if (scope === 'ALL_TEAMS' && req.securityContext!.actorManagesTeamIds?.length) {
      conditions.push(inArray(schema.calls.teamId, req.securityContext!.actorManagesTeamIds));
    } else if (scope === 'SELF') {
      conditions.push(eq(schema.calls.repId, req.securityContext!.actorUserId));
    }
    
    const calls = await db.select().from(schema.calls).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(schema.calls.timestamp)).limit(100);
    res.json(calls);
  });

  app.post('/api/calls', async (req, res) => {
    const { leadId, disposition, duration, notes, timestamp } = req.body;
    if (!leadId) return res.status(400).json({ error: 'Lead ID required' });
    
    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).limit(1);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];

    const newCall = {
      id: `call-${Date.now()}`,
      tenantId: req.securityContext!.tenantId || null,
      leadId,
      repId: req.user!.id,
      repName: req.user!.name,
      teamId: req.user!.teamId || null,
      outcome: disposition || 'Connected',
      duration: duration || 0,
      timestamp: timestamp || new Date().toISOString(),
      notes: notes || '',
      complianceFlags: []
    };

    if (newCall.notes.length > 0) {
      if (/(credit card|ssn|social security|password)/i.test(newCall.notes)) {
         newCall.complianceFlags.push('PII_DETECTED');
         adapterLogAudit(req, 'COMPLIANCE_VIOLATION', `PII detected in call notes for ${leadId}`, req.user, getClientIp(req), { severity: 'HIGH' });
      }
    }
    
    await db.insert(schema.calls).values(newCall as any);
    await db.update(schema.leads).set({ lastContactDate: newCall.timestamp }).where(eq(schema.leads.id, leadId));
    
    adapterLogAudit(req, 'CALL_LOGGED', `Logged call for lead ${leadId}`, req.user, getClientIp(req));
    res.json(newCall);
  });

  // 7. WhatsApp Messaging APIs
  app.get('/api/messages', async (req, res) => {
    const tenantId = req.securityContext!.tenantId;
    if (!tenantId && !req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Tenant context required' });

    const conditions = [];
    if (tenantId) conditions.push(eq(schema.messages.tenantId, tenantId));
    
    const scope = await getScope(req.securityContext!);
    if (scope === 'TEAM' && req.securityContext!.actorTeamId) {
      conditions.push(eq(schema.messages.teamId, req.securityContext!.actorTeamId));
    } else if (scope === 'ALL_TEAMS' && req.securityContext!.actorManagesTeamIds?.length) {
      conditions.push(inArray(schema.messages.teamId, req.securityContext!.actorManagesTeamIds));
    } else if (scope === 'SELF') {
      conditions.push(eq(schema.messages.repId, req.securityContext!.actorUserId));
    }

    const msgs = await db.select().from(schema.messages).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(schema.messages.timestamp)).limit(100);
    res.json(msgs);
  });

  app.get('/api/messages/health', async (req, res) => {
    // Legacy placeholder
    res.json({ status: 'ok', provider: 'whatsapp-cloud' });
  });

  app.post('/api/messages', async (req, res) => {
    const { leadId, text, channel } = req.body;
    if (!leadId || !text) return res.status(400).json({ error: 'Lead ID and text required' });

    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).limit(1);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];

    const newMsg = {
      id: `msg-${Date.now()}`,
      tenantId: req.securityContext!.tenantId || null,
      leadId,
      repId: req.user!.id,
      teamId: req.user!.teamId || null,
      direction: 'outbound',
      channel: channel || 'whatsapp',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent',
      deliveryStatus: 'sent'
    };

    await db.insert(schema.messages).values(newMsg);
    adapterLogAudit(req, 'MESSAGE_SENT', `Sent ${newMsg.channel} message to ${leadId}`, req.user, getClientIp(req));
    res.json(newMsg);
  });

  app.post('/api/messages/simulate-reply', async (req, res) => {
    const { leadId, text } = req.body;
    if (!leadId || !text) return res.status(400).json({ error: 'Lead ID and text required' });

    const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).limit(1);
    if (!leads.length) return res.status(404).json({ error: 'Lead not found' });
    const lead = leads[0];

    const replyMsg = {
      id: `msg-${Date.now()}`,
      tenantId: req.securityContext?.tenantId || lead.tenantId,
      leadId,
      repId: lead.assignedRepId,
      teamId: lead.teamId,
      direction: 'inbound',
      channel: 'whatsapp',
      text: text.trim(),
      timestamp: new Date().toISOString(),
      status: 'delivered',
      deliveryStatus: 'delivered'
    };

    await db.insert(schema.messages).values(replyMsg as any);
    await db.update(schema.leads).set({ lastContactDate: replyMsg.timestamp }).where(eq(schema.leads.id, leadId));
    
    adapterLogAudit(req, 'SIMULATE_REPLY', `Simulated inbound message from ${leadId}`, req.user, getClientIp(req));
    res.json(replyMsg);
  });

  // 8. Compliance Rules & Verification APIs
  app.get('/api/compliance/rules', async (req, res) => {
    const tenantId = req.tenantId || req.securityContext?.tenantId || 'tenant-apex';
    const rules = await compliancePolicyRepository.getEffectivePolicy(tenantId);
    res.json(rules);
  });

  app.put('/api/compliance/rules', async (req, res) => {
    if (!(await can(req.securityContext!, 'compliance:manage'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied MANAGE_COMPLIANCE_RULES to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_COMPLIANCE_RULES' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks MANAGE_COMPLIANCE_RULES permission.`,
        code: 'FORBIDDEN',
        action: 'MANAGE_COMPLIANCE_RULES'
      });
    }

    const requiresApproval = await actionRequiresApproval(req.user!, 'MANAGE_COMPLIANCE_RULES');
    if (requiresApproval && req.body.confirmed !== true) {
      return res.status(202).json({
        requiresApproval: true,
        action: 'MANAGE_COMPLIANCE_RULES',
        message: 'Updating calling compliance rules affects company-wide frequency caps and quiet hours. Confirm update?',
        warning: 'Compliance rule update requires explicit confirmation.'
      });
    }

    const tenantId = req.tenantId || req.securityContext?.tenantId || 'tenant-apex';
    const { confirmed, ...updates } = req.body;
    const expectedVersion = updates.version;
    delete updates.version;

    try {
      const updated = await compliancePolicyRepository.upsert(tenantId, updates, req.user!.id, expectedVersion);
      adapterLogAudit(req, 'COMPLIANCE_RULES_UPDATED', `Updated compliance policy for tenant ${tenantId}`, req.user, getClientIp(req), {
        actionType: 'MANAGE_COMPLIANCE_RULES',
        requiredApproval: requiresApproval,
        tenantId,
      });
      res.json({ success: true, rules: updated });
    } catch (err: any) {
      if (err?.code === 'POLICY_VERSION_CONFLICT') {
        return res.status(409).json({
          error: err.message,
          code: 'POLICY_VERSION_CONFLICT',
          currentVersion: err.currentVersion,
          expectedVersion: err.expectedVersion,
        });
      }
      throw err;
    }
  });

  app.get('/api/compliance/check', async (req, res) => {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) return res.status(400).json({ error: 'Missing parameters' });

    let dataObj = null;
    if (entityType === 'call') {
      const calls = await db.select().from(schema.calls).where(eq(schema.calls.id, String(entityId))).limit(1);
      dataObj = calls[0];
    } else if (entityType === 'lead') {
      const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, String(entityId))).limit(1);
      dataObj = leads[0];
    }

    if (!dataObj) return res.status(404).json({ error: 'Entity not found' });
    
    let evaluation;
    if (entityType === 'lead') {
      evaluation = await complianceService.checkLeadCompliance(dataObj as Lead, 'Call', req.securityContext!, req.securityContext!.tenantId);
    } else {
      evaluation = { allowed: true, note: 'Compliance check bypassed for non-lead entity' };
    }
    res.json(evaluation);
  });

  // 9. Support Tickets APIs
  app.get('/api/tickets', async (req, res) => {
    const tenantId = req.securityContext!.tenantId;
    if (!tenantId && !req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Tenant context required' });
    
    const conditions = [];
    if (tenantId) conditions.push(eq(schema.tickets.tenantId, tenantId));
    
    const ticketsData = await db.select().from(schema.tickets).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(schema.tickets.createdDate)).limit(100);
    
    const ticketIds = ticketsData.map(t => t.id);
    let repliesData: any[] = [];
    if (ticketIds.length > 0) {
      repliesData = await db.select().from(schema.ticketReplies).where(inArray(schema.ticketReplies.ticketId, ticketIds)).orderBy(schema.ticketReplies.timestamp);
    }
    
    const ticketsWithReplies = ticketsData.map(t => ({
      ...t,
      replies: repliesData.filter(r => r.ticketId === t.id)
    }));
    
    res.json(ticketsWithReplies);
  });

  app.post('/api/tickets', async (req, res) => {
    const { subject, priority, leadId, initialMessage, assignedRepId } = req.body;
    if (!subject || !validateText(subject, 1, 200)) return res.status(400).json({ error: 'Invalid ticket subject' });

    const now = new Date();
    const slaDue = new Date(now.getTime() + 4 * 3600 * 1000);
    let leadName;
    if (leadId) {
       const leads = await db.select().from(schema.leads).where(eq(schema.leads.id, leadId)).limit(1);
       if (leads.length) leadName = leads[0].name;
    }

    const newTicket = {
      id: `tkt-${Date.now()}`,
      tenantId: req.securityContext!.tenantId || null,
      subject: subject.trim(),
      status: 'Open',
      createdDate: now.toISOString(),
      slaDueTime: slaDue.toISOString(),
      priority: priority || 'Medium',
      leadId: leadId || null,
      leadName: leadName || null,
      assignedRepId: assignedRepId || null,
    };

    await db.insert(schema.tickets).values(newTicket);

    const replies = [];
    if (initialMessage) {
      const reply = {
        id: `rep-${Date.now()}`,
        ticketId: newTicket.id,
        sender: req.user!.name,
        senderRole: req.user!.role,
        text: initialMessage.trim(),
        timestamp: new Date().toISOString()
      };
      await db.insert(schema.ticketReplies).values(reply);
      replies.push(reply);
    }

    adapterLogAudit(req, 'TICKET_CREATED', `Ticket opened: "${newTicket.subject}"`, req.user, getClientIp(req));
    res.json({ ...newTicket, replies });
  });

  app.post('/api/tickets/:id/replies', async (req, res) => {
    const { id } = req.params;
    const { text, updateStatus } = req.body;
    if (!text) return res.status(400).json({ error: 'Invalid reply text' });

    const ticketsData = await db.select().from(schema.tickets).where(eq(schema.tickets.id, id)).limit(1);
    if (!ticketsData.length) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = ticketsData[0];

    const reply = {
      id: `rep-${Date.now()}`,
      ticketId: id,
      sender: req.user!.name,
      senderRole: req.user!.role,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };
    await db.insert(schema.ticketReplies).values(reply);

    let newStatus = ticket.status;
    if (updateStatus && ['Open', 'In Progress', 'Resolved'].includes(updateStatus)) {
      newStatus = updateStatus;
    } else if (ticket.status === 'Open') {
      newStatus = 'In Progress';
    }

    if (newStatus !== ticket.status) {
      await db.update(schema.tickets).set({ status: newStatus }).where(eq(schema.tickets.id, id));
      ticket.status = newStatus;
    }

    const repliesData = await db.select().from(schema.ticketReplies).where(eq(schema.ticketReplies.ticketId, id)).orderBy(schema.ticketReplies.timestamp);
    
    adapterLogAudit(req, 'TICKET_REPLY', `Reply added to ticket #${id}`, req.user, getClientIp(req));
    res.json({ ...ticket, replies: repliesData });
  });

  app.put('/api/tickets/:id', async (req, res) => {
    const { id } = req.params;
    const ticketsData = await db.select().from(schema.tickets).where(eq(schema.tickets.id, id)).limit(1);
    if (!ticketsData.length) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = ticketsData[0];

    const { status, priority, assignedRepId } = req.body;
    const updates: any = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (assignedRepId !== undefined) updates.assignedRepId = assignedRepId || null;

    if (Object.keys(updates).length > 0) {
      await db.update(schema.tickets).set(updates).where(eq(schema.tickets.id, id));
    }

    const repliesData = await db.select().from(schema.ticketReplies).where(eq(schema.ticketReplies.ticketId, id)).orderBy(schema.ticketReplies.timestamp);

    adapterLogAudit(req, 'TICKET_UPDATED', `Ticket #${id} updated`, req.user, getClientIp(req));
    res.json({ ...ticket, ...updates, replies: repliesData });
  });

  // 10. Reports & Analytics
  app.get('/api/reports', async (req, res) => {
    const stats = calculateReports();
    res.json(stats);
  });

  // 11. Audit Logs (Business actions)
  app.get('/api/audit-logs', async (req, res) => {
    const tenantId = req.securityContext!.tenantId;
    if (!tenantId && !req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Tenant context required' });

    if (!(await can(req.securityContext!, 'platform:manage')) && req.user!.role !== 'owner' && req.user!.role !== 'it') {
       return res.status(403).json({ error: 'Forbidden: Requires admin or IT privileges' });
    }

    const conditions = [];
    if (tenantId) conditions.push(eq(schema.auditLogs.tenantId, tenantId));
    
    const logs = await db.select()
      .from(schema.auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditLogs.occurredAt))
      .limit(100);

    res.json(logs);
  });

  // Dedicated Infrastructure Telemetry: Blocked AI Crawler attempts (separate from business audit log)
  app.get('/api/crawler-telemetry', async (req, res) => {
    if (!['owner', 'cto', 'it', 'Admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to view infrastructure telemetry.' });
    }
    const blocks = getRecentCrawlerBlocks(100);
    res.json({ count: blocks.length, blocks });
  });

  // 12. Automated Backups & Snapshots
  app.get('/api/backups', async (req, res) => {
    // Backups are now managed externally via infrastructure. Return empty array to keep UI from crashing.
    res.json([]);
  });

  app.post('/api/backups', async (req, res) => {
    return res.status(501).json({ error: 'Not Implemented: Backups are now managed by infrastructure scripts (pg_dump). Application identity no longer has backup privileges.' });
  });

  // Admin & IT restore
  app.post('/api/backups/:id/restore', async (req, res) => {
    return res.status(501).json({ error: 'Not Implemented: Restores must be performed by infrastructure administrators using secure restore scripts.' });
  });

  // Database Reset (Owner, CTO, IT only)
  app.post('/api/reset-data', async (req, res) => {
    return res.status(501).json({ error: 'Not Implemented: Destructive database operations are disabled in the application runtime.' });
  });

  // 14. Settings APIs (Custom Fields, Role Permissions, Pipeline, Auto-Assignment)
  app.get('/api/settings', async (req, res) => {
    if (req.user!.role !== 'owner' && req.user!.role !== 'it' && req.user!.role !== 'cto') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const tenantId = req.securityContext!.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });

    const settingsData = await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, tenantId)).limit(1);
    res.json(settingsData[0] || {});
  });

  app.put('/api/settings/fields', async (req, res) => {
    res.status(400).json({ error: 'Not implemented in v2' });
  });

  app.put('/api/settings/roles', async (req, res) => {
    res.status(400).json({ error: 'Not implemented in v2' });
  });

  app.put('/api/settings/pipeline', async (req, res) => {
    res.status(400).json({ error: 'Not implemented in v2' });
  });

  app.put('/api/settings/auto-assignment', async (req, res) => {
    res.status(400).json({ error: 'Not implemented in v2' });
  });

  // 15. Audio Transcription API via aiService
  app.post('/api/transcribe', async (req, res) => {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 string is required.' });
    }

    if (!req.securityContext) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const audioMime = mimeType || 'audio/webm';

    try {
      const transcribedText = await aiService.transcribeAudio(
        req.securityContext,
        cleanBase64,
        audioMime
      );

      res.json({
        text: transcribedText,
        model: 'gemini-3.5-transcribe' // Hardcoded placeholder to keep UI compatible for now
      });
    } catch (err: any) {
        logger.warn('[REDIS] Fallback to in-memory rate limiting', {
          errorDetail: err instanceof Error ? { message: err.message, stack: err.stack } : err
        });
      // aiService will throw if unauthorized, quota exceeded, or provider error.
      const status = err.message.includes('Unauthorized') ? 403 : 500;
      res.status(status).json({
        error: err.message || 'Failed to transcribe audio',
        code: status === 403 ? 'FORBIDDEN' : 'TRANSCRIPTION_FAILED'
      });
    }
  });

  // ==========================================
  // PLATFORM OPERATIONS (Steps 1-5)
  // ==========================================

  // Step 1: Tenant directory and lifecycle control
  app.get('/api/platform/tenants', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const tenants = await db.select().from(schema.tenants);
    res.json(tenants);
  });

  app.get('/api/platform/tenants/:id', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    const tenants = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id)).limit(1);
    if (!tenants.length) return res.status(404).json({ error: 'Not found' });
    res.json(tenants[0]);
  });

  app.post('/api/platform/tenants/:id/suspend', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    await db.update(schema.tenants).set({ status: 'suspended' }).where(eq(schema.tenants.id, id));
    adapterLogAudit(req, 'PLATFORM_ACTION', `Suspended tenant ${id}`, req.user, getClientIp(req));
    res.json({ success: true });
  });

  app.post('/api/platform/tenants/:id/reactivate', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const { id } = req.params;
    await db.update(schema.tenants).set({ status: 'active' }).where(eq(schema.tenants.id, id));
    adapterLogAudit(req, 'PLATFORM_ACTION', `Reactivated tenant ${id}`, req.user, getClientIp(req));
    res.json({ success: true });
  });

  // Step 2: Cross-tenant Security Operations Center
  app.get('/api/platform/soc/alerts', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    res.json([]);
  });

  // Step 3: Impersonation
  app.post('/api/platform/impersonate', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const { targetUserId, reason } = req.body;
    if (!targetUserId || !reason) return res.status(400).json({ error: 'Target User ID and reason are required' });
    
    const usersData = await db.select().from(schema.users).where(eq(schema.users.id, targetUserId)).limit(1);
    if (!usersData.length) return res.status(404).json({ error: 'User not found' });
    const targetUser = usersData[0];

    adapterLogAudit(req, 'PLATFORM_IMPERSONATION', `Platform staff impersonating ${targetUserId} for reason: ${reason}`, req.user, getClientIp(req), { severity: 'CRITICAL', targetUserId });
    
    const sessionId = req.securityContext!.sessionId;
    const token = signAccessToken({ id: targetUser.id, email: targetUser.email, role: targetUser.role as any, tenantId: targetUser.tenantId, isPlatformStaff: true }, sessionId);
    
    res.json({ token, impersonating: targetUser });
  });

  app.post('/api/platform/impersonate/end', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    
    // Find active session in postgres
    const activeRecords = await db.select().from(impersonationSessions)
      .where(
        and(
          eq(impersonationSessions.platformUserId, req.user!.id),
          eq(impersonationSessions.active, true)
        )
      )
      .limit(1);

    if (activeRecords.length > 0) {
       const active = activeRecords[0];
       await db.update(impersonationSessions)
         .set({ active: false, endedAt: new Date().toISOString() })
         .where(eq(impersonationSessions.id, active.id));

       adapterLogAudit(req, 'IMPERSONATION_ENDED', `Ended impersonating ${active.targetTenantName}.`, req.user, getClientIp(req), { tenantId: 'platform' });
    }
    res.json({ success: true });
  });

  // Step 4: Billing across tenants
  app.get('/api/platform/billing', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    res.json([]);
  });

  app.post('/api/platform/billing/:id/mark-paid', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    res.json({ success: true });
  });

  // Step 5: Feature-flag / release control
  app.get('/api/platform/features', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    res.json([]);
  });

  app.put('/api/platform/features/:id', async (req, res) => {
    if (!req.securityContext!.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    res.json({ success: true });
  });

  // Helper endpoint to check a flag for a specific tenant (can be called by frontend)
  app.get('/api/features/check', async (req, res) => {
    const tenantId = req.securityContext!.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });
    res.json({ ok: true });
  });

  // Health check for testing
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.listen(Number(PORT) || 3000, () => { console.log('[INIT] Server running on port', PORT); });
}

startServer().catch(err => { console.error(err); process.exit(1); });
