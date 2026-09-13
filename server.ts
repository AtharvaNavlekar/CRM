import { generateOpaqueRefreshToken, hashToken } from './server/auth';
import { db } from './server/db/client';
import { auditService } from './server/services/auditService';
import { AuditEvents, AuditOutcomes } from './server/constants/auditEvents';
import { sessions, impersonationSessions } from './server/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import express from 'express';
import { can } from './server/policy';
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
  loadDatabase,
  getLegacyState,
  getDb,
  saveDatabase,
  createBackup,
  restoreBackup,
  resetDatabase,
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

// Initialize in-memory/file-backed database
loadDatabase();

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
    // rate-limit-redis handles fallback behavior somewhat, but explicitly failing open/closed needs care.
    // For now we pass the client; if Redis is down, we want to ensure the app doesn't crash.
    store: new RedisStore({
      // @ts-expect-error - rate-limit-redis types are slightly mismatched with ioredis but perfectly compatible
      sendCommand: async (...args: string[]) => {
        const client = redisService.getClient();
        if (client && args.length > 0) {
          const command = args[0];
          const commandArgs = args.slice(1);
          return client.call(command, ...commandArgs);
        }
        // If Redis is down, we fail OPEN (let request through) to avoid total denial of service.
        // Returning a mock successful reply to rate-limit-redis bypasses the limit.
        return null;
      },
    }),
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
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    const legacyDb = await getLegacyState();
    const user = legacyDb.users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcryptjs.compareSync(String(password), user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate Session
    const tokenFamilyId = crypto.randomUUID();
    const rawRefreshToken = generateOpaqueRefreshToken();
    const refreshTokenHash = hashToken(rawRefreshToken);
    const sessionId = crypto.randomUUID();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

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

    const token = signAccessToken({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, isPlatformStaff: user.isPlatformStaff }, sessionId);

    adapterLogAudit(req, 'USER_LOGIN', `${user.name} logged into DialPulse CRM`, { id: user.id, name: user.name, role: user.role }, getClientIp(req));
    
    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth'
    });

    const dbState = await getLegacyState();
    const perms = dbState.rolePermissions || [];
    const rolePermission = perms.find(p => p.role === user.role);

    res.json({ 
      user: sanitizeUser(user), 
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
    if (!rawRefreshToken) {
      return res.status(401).json({ error: 'Refresh token is required', code: 'REFRESH_TOKEN_REQUIRED' });
    }

    const hashedToken = hashToken(rawRefreshToken);
    
    // Find session
    const sessionRecords = await db.select().from(sessions).where(eq(sessions.refreshTokenHash, hashedToken));
    const session = sessionRecords[0];

    if (!session) {
      return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_TOKEN' });
    }

    if (session.revokedAt) {
      // REUSE DETECTION! Token was already revoked but is being used again
      // Revoke the entire family
      await db.update(sessions)
        .set({ revokedAt: new Date().toISOString(), revokeReason: 'reuse_detected' })
        .where(eq(sessions.tokenFamilyId, session.tokenFamilyId));
        
      adapterLogAudit(req, 'SECURITY_ALERT', 'Token reuse detected', { id: session.userId, name: 'Unknown', role: 'Unknown' }, getClientIp(req), { actionType: 'SECURITY' });
      
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ error: 'Session invalidated due to suspicious activity', code: 'TOKEN_REVOKED' });
    }

    if (new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired', code: 'TOKEN_EXPIRED' });
    }

    const legacyDb = await getLegacyState();
    const user = legacyDb.users.find(u => u.id === session.userId);
    if (!user) {
      return res.status(401).json({ error: 'User account not found', code: 'USER_NOT_FOUND' });
    }

    const perms = legacyDb.rolePermissions || [];
    const rolePermission = perms.find(p => p.role === user.role);

    // Atomically rotate: revoke old token and create new one (simulated transactionally)
    const now = new Date();
    await db.update(sessions)
      .set({ revokedAt: now.toISOString(), revokeReason: 'rotated' })
      .where(eq(sessions.id, session.id));

    const newRawRefreshToken = generateOpaqueRefreshToken();
    const newSessionId = crypto.randomUUID();
    
    await db.insert(sessions).values({
      id: newSessionId,
      userId: user.id,
      tenantId: user.tenantId,
      tokenFamilyId: session.tokenFamilyId, // keep same family
      refreshTokenHash: hashToken(newRawRefreshToken),
      createdAt: now.toISOString(),
      expiresAt: session.expiresAt, // keep original expiry limit (or extend it depending on policy)
      lastUsedAt: now.toISOString(),
      createdIp: session.createdIp,
      lastUsedIp: getClientIp(req),
      createdUserAgent: session.createdUserAgent,
      lastUsedUserAgent: req.headers['user-agent']?.substring(0, 255),
    });

    const token = signAccessToken({ id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, isPlatformStaff: user.isPlatformStaff }, newSessionId);

    res.cookie('refreshToken', newRawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth'
    });

    res.json({ 
      token, 
      user: sanitizeUser(user),
      securityContext: {
        actorRole: user.role,
        tenantId: user.tenantId,
        actingAsUserId: user.id,
        sessionId: newSessionId,
        impersonating: false,
        isPlatformStaff: user.isPlatformStaff
      },
      permissions: rolePermission
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    const db = await getLegacyState();
    const user = db.users.find(u => u.id === req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const sanitized = sanitizeUser(user);
    if (req.isPlatformStaff) {
       (sanitized as any).impersonationSession = req.impersonationSession || null;
    }

    const perms = db.rolePermissions || [];
    let effectiveRole = req.securityContext?.actorRole || user.role;
    const rolePermission = perms.find(p => p.role === effectiveRole);

    res.json({ 
      user: sanitized,
      securityContext: req.securityContext,
      permissions: rolePermission
    });
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
    const db = await getLegacyState();
    res.json(db.users.map(sanitizeUser));
  });

  // Account creation is gated by MANAGE_USERS permission
  app.post('/api/users', async (req, res) => {
    if (!(await can(req.securityContext!, 'users:create'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied MANAGE_USERS to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_USERS' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks MANAGE_USERS permission.`,
        code: 'FORBIDDEN',
        action: 'MANAGE_USERS'
      });
    }

    const { name, email, role, title, phone, password, teamId, managesTeamIds } = req.body;
    const db = await getLegacyState();

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (!validateText(name, 1, 100)) {
      return res.status(400).json({ error: 'Name must be between 1 and 100 characters' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    const validRoles: UserRole[] = ['telecaller', 'tl', 'tl_head', 'it', 'owner', 'cto'];
    let assignedRole: UserRole = role || 'telecaller';
    if (assignedRole === ('Rep' as any)) assignedRole = 'telecaller';
    if (assignedRole === ('Team Lead' as any)) assignedRole = 'tl';
    if (assignedRole === ('Admin' as any)) assignedRole = 'owner';

    if (!validRoles.includes(assignedRole)) {
      return res.status(400).json({ error: `Role must be one of: ${validRoles.join(', ')}` });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Generate secure random password if not explicitly supplied
    let passwordHash: string;
    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      }
      passwordHash = bcryptjs.hashSync(password, 10);
    } else {
      const randomSecret = crypto.randomBytes(32).toString('hex');
      passwordHash = bcryptjs.hashSync(randomSecret, 10);
    }

    // Check duplicate email
    if (db.users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const defaultTitle: Record<string, string> = {
      owner: 'Owner & Managing Director',
      cto: 'Chief Technology Officer',
      it: 'IT Administrator',
      tl_head: 'Head of Telecalling',
      tl: 'Team Lead',
      telecaller: 'Telecaller'
    };

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: assignedRole,
      teamId: teamId || (assignedRole === 'telecaller' || assignedRole === 'tl' ? 'team-mumbai' : undefined),
      managesTeamIds: managesTeamIds || (assignedRole === 'tl_head' ? ['team-mumbai', 'team-delhi'] : undefined),
      passwordHash,
      title: title || defaultTitle[assignedRole] || 'Team Member',
      phone: phone || '+91 98' + Math.floor(10000000 + Math.random() * 90000000)
    };

    db.users.push(newUser);
    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'USER_INVITED', `${req.user!.name} created user ${newUser.name} with role ${newUser.role}`, req.user, getClientIp(req), { actionType: 'MANAGE_USERS' });
    res.json(sanitizeUser(newUser));
  });

  // 5. Leads APIs
  app.get('/api/leads', async (req, res) => {
    const db = await getLegacyState();
    const { repId, source, stage, search } = req.query;
    let leads = [...db.leads];

    // Server-enforced scope filtering via authorize()
    const canViewResults = await Promise.all(leads.map(l => can(req.securityContext!, 'leads:read', { teamId: l.teamId, ownerId: l.assignedRepId })));
    leads = leads.filter((l, i) => canViewResults[i]);

    if (repId && typeof repId === 'string' && repId !== 'all') {
      leads = leads.filter(l => l.assignedRepId === repId);
    }
    if (source && typeof source === 'string' && source !== 'all') {
      leads = leads.filter(l => l.source.toLowerCase() === source.toLowerCase());
    }
    if (stage && typeof stage === 'string' && stage !== 'all') {
      leads = leads.filter(l => l.stage.toLowerCase() === stage.toLowerCase());
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      leads = leads.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.notes && l.notes.toLowerCase().includes(q))
      );
    }

    leads.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
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
    const db = await getLegacyState();
    const { id } = req.params;
    const lead = db.leads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!(await can(req.securityContext!, 'leads:read', { teamId: lead.teamId, ownerId: lead.assignedRepId }))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied VIEW for lead ${lead.id} to ${req.user!.name}`, req.user, getClientIp(req), {
        actionType: 'VIEW',
        scope: (await getRolePermission(req.user!.role))?.scope
      });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' cannot view lead outside authorized scope.`,
        code: 'FORBIDDEN',
        action: 'VIEW'
      });
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
    const db = await getLegacyState();
    if (!(await can(req.securityContext!, 'leads:create'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied lead creation for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks permission to create leads.`,
        code: 'FORBIDDEN',
        action: 'EDIT'
      });
    }

    const {
      name,
      phone,
      source,
      notes,
      assignedRepId,
      industry,
      value,
      callbackReminder,
      email,
      stage,
      preferences,
      fatigueStatus,
      isOptedOut,
      blockedReason,
      contactAttempts7d,
      customFields,
      teamId
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Lead name and phone number are required' });
    }

    if (!validateText(name, 1, 100)) {
      return res.status(400).json({ error: 'Lead name must be between 1 and 100 characters' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ error: 'Invalid lead phone number format (8-25 characters allowed)' });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    if (notes && !validateText(notes, 0, 2000)) {
      return res.status(400).json({ error: 'Notes cannot exceed 2000 characters' });
    }

    // Determine assigned user and keep lead's teamId in sync with rep's team
    const assignedUser = (assignedRepId ? db.users.find(u => u.id === assignedRepId) : null)
      || (req.user!.role === 'telecaller' ? req.user! : db.users.find(u => u.role === 'telecaller') || db.users[0]);
    const leadTeamId = teamId || assignedUser.teamId || req.user!.teamId || 'team-mumbai';
    const nowIso = new Date().toISOString();

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      name: sanitizeFormula(name.trim()),
      phone: sanitizeFormula(phone.trim()),
      email: email ? email.trim().toLowerCase() : undefined,
      source: source || 'Manual',
      stage: stage || 'New',
      teamId: leadTeamId,
      assignedRepId: assignedUser.id,
      assignedRepName: assignedUser.name,
      createdDate: nowIso,
      updatedAt: nowIso,
      version: 1,
      notes: notes ? sanitizeFormula(notes.trim()) : '',
      industry: industry || 'Real Estate',
      value: Number(value) || 500000,
      callbackReminder: callbackReminder || null,
      preferences: preferences || (isOptedOut !== undefined ? {
        preferredChannel: 'Any',
        preferredTimeWindow: 'Anytime',
        allowedTopics: [],
        isPaused30Days: false,
        isOptedOut: Boolean(isOptedOut),
        updatedAt: nowIso
      } : undefined),
      fatigueStatus: fatigueStatus || undefined,
      blockedReason: blockedReason || undefined,
      contactAttempts7d: contactAttempts7d || { calls: 0, whatsapp: 0, sms: 0 },
      customFields: customFields || undefined
    };

    db.leads.unshift(newLead);
    // saveDatabase(); // TODO: Migrate to repository write

    adapterLogAudit(req, 'LEAD_CREATED', `Added new lead: ${newLead.name} (${newLead.source}) assigned to ${newLead.assignedRepName} [${leadTeamId}]`, req.user, getClientIp(req), {
      actionType: 'EDIT'
    });
    res.json(newLead);
  });

  // Optimistic Concurrency Update with Scope Authorization & Reassignment Control
  app.put('/api/leads/:id', async (req, res) => {
    const db = await getLegacyState();
    const { id } = req.params;
    const index = db.leads.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const oldLead = db.leads[index];
    const updates = req.body;

    // Scope & Action Check: Can user EDIT this lead?
    if (!(await can(req.securityContext!, 'leads:update', { teamId: oldLead.teamId, ownerId: oldLead.assignedRepId }))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied EDIT on lead ${oldLead.id} for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
      return res.status(403).json({
        error: `Forbidden: You do not have permission to edit lead "${oldLead.name}".`,
        code: 'FORBIDDEN',
        action: 'EDIT'
      });
    }

    // Reassignment Check: Can user REASSIGN this lead?
    const isReassigning = updates.assignedRepId && updates.assignedRepId !== oldLead.assignedRepId;
    if (isReassigning) {
      if (!(await can(req.securityContext!, 'leads:reassign', { teamId: oldLead.teamId, ownerId: oldLead.assignedRepId }))) {
        adapterLogAudit(req, 'ACCESS_DENIED', `Denied REASSIGN on lead ${oldLead.id} for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'REASSIGN' });
        return res.status(403).json({
          error: `Forbidden: Current role '${req.user!.role}' lacks permission to reassign leads.`,
          code: 'FORBIDDEN',
          action: 'REASSIGN'
        });
      }
      const targetRep = db.users.find(u => u.id === updates.assignedRepId);
      if (targetRep) {
        updates.assignedRepName = targetRep.name;
        // Keep teamId in sync automatically from whichever rep it's assigned to
        if (targetRep.teamId) {
          updates.teamId = targetRep.teamId;
        }
        adapterLogAudit(req, 'LEAD_REASSIGNED', `Lead ${oldLead.name} reassigned from ${oldLead.assignedRepName} to ${targetRep.name}`, req.user, getClientIp(req), { actionType: 'REASSIGN' });
      }
    }

    // Approval check for EDIT (e.g. owner and cto roles have EDIT in requiresApproval)
    const requiresApproval = await actionRequiresApproval(req.user!, 'EDIT');
    if (requiresApproval && req.body.confirmed !== true) {
      return res.status(202).json({
        requiresApproval: true,
        action: 'EDIT',
        message: `You are modifying lead "${oldLead.name}". As an executive account (${req.user!.role.toUpperCase()}), this change requires explicit confirmation.`,
        warning: 'Executive modification requires explicit confirmation.'
      });
    }

    // Optimistic Concurrency Control: Require strict version match
    if (typeof updates.version !== 'number' || updates.version !== oldLead.version) {
      return res.status(409).json({
        error: 'Conflict: This lead has been modified by another user since you loaded it. Please reload the latest data before saving.',
        code: 'LEAD_CONFLICT',
        currentLead: oldLead
      });
    }

    if (updates.name !== undefined && !validateText(updates.name, 1, 100)) {
      return res.status(400).json({ error: 'Lead name must be between 1 and 100 characters' });
    }

    if (updates.phone !== undefined && !validatePhone(updates.phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (updates.email !== undefined && updates.email && !validateEmail(updates.email)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    if (updates.notes !== undefined && !validateText(updates.notes, 0, 2000)) {
      return res.status(400).json({ error: 'Notes cannot exceed 2000 characters' });
    }

    if (updates.stage && updates.stage !== oldLead.stage) {
      adapterLogAudit(req, 'LEAD_STAGE_CHANGED', `${oldLead.name} moved from ${oldLead.stage} to ${updates.stage}`, req.user, getClientIp(req), { actionType: 'EDIT' });
    }

    const nextVersion = (oldLead.version || 1) + 1;
    const nextUpdatedAt = new Date().toISOString();

    const updatedLead: Lead = {
      ...oldLead,
      ...updates,
      name: updates.name !== undefined ? sanitizeFormula(updates.name) : oldLead.name,
      notes: updates.notes !== undefined ? sanitizeFormula(updates.notes) : oldLead.notes,
      version: nextVersion,
      updatedAt: nextUpdatedAt
    };

    db.leads[index] = updatedLead;
    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'LEAD_UPDATED', `Lead ${oldLead.name} updated`, req.user, getClientIp(req), {
      actionType: 'EDIT',
      requiredApproval: requiresApproval
    });
    res.json(updatedLead);
  });

  // Lead deletion gated by DELETE permission and approval workflow
  app.delete('/api/leads/:id', async (req, res) => {
    if (!(await can(req.securityContext!, 'leads:delete'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied DELETE on lead for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'DELETE' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks permission to delete leads.`,
        code: 'FORBIDDEN',
        action: 'DELETE'
      });
    }

    const db = await getLegacyState();
    const { id } = req.params;
    const lead = db.leads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!(await can(req.securityContext!, 'leads:delete', { teamId: lead.teamId, ownerId: lead.assignedRepId }))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied DELETE on lead ${lead.id} for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'DELETE' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks DELETE permission for lead "${lead.name}".`,
        code: 'FORBIDDEN',
        action: 'DELETE'
      });
    }

    const requiresApproval = await actionRequiresApproval(req.user!, 'DELETE');
    if (requiresApproval && req.body?.confirmed !== true && req.query?.confirmed !== 'true') {
      return res.status(202).json({
        requiresApproval: true,
        action: 'DELETE',
        message: `You are about to permanently delete lead "${lead.name}". This action is logged and cannot be undone. Confirm?`,
        warning: 'Permanent lead deletion requires explicit confirmation.'
      });
    }

    db.leads = db.leads.filter(l => l.id !== id);
    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'LEAD_DELETED', `Deleted lead record for ${lead.name}`, req.user, getClientIp(req), {
      actionType: 'DELETE',
      requiredApproval: requiresApproval
    });
    res.json({ success: true, id });
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
    const db = await getLegacyState();
    const { leadId, repId } = req.query;
    let calls = [...db.calls];

    // Scope-aware call log filtering based on user RBAC scope
    const userRole = req.user!.role;
    const perm = await getRolePermission(userRole);
    if (perm?.scope === 'SELF') {
      if (repId && repId !== 'all' && repId !== req.user!.id) {
        return res.status(403).json({
          error: `Forbidden: You do not have permission to view call logs of representative ${repId}.`,
          code: 'FORBIDDEN',
          action: 'VIEW'
        });
      }
      calls = calls.filter(c => c.repId === req.user!.id);
    } else if (perm?.scope === 'TEAM') {
      const userTeam = req.user!.teamId;
      calls = calls.filter(c => {
        const lead = db.leads.find(l => l.id === c.leadId);
        const rep = db.users.find(u => u.id === c.repId);
        return (lead && lead.teamId === userTeam) || (rep && rep.teamId === userTeam) || c.repId === req.user!.id;
      });
      if (repId && typeof repId === 'string' && repId !== 'all') {
        calls = calls.filter(c => c.repId === repId);
      }
    } else if (perm?.scope === 'ALL_TEAMS') {
      const managesTeams = req.user!.managesTeamIds || [];
      if (managesTeams.length > 0) {
        calls = calls.filter(c => {
          const lead = db.leads.find(l => l.id === c.leadId);
          const rep = db.users.find(u => u.id === c.repId);
          return (lead && lead.teamId && managesTeams.includes(lead.teamId)) ||
                 (rep && rep.teamId && managesTeams.includes(rep.teamId)) ||
                 c.repId === req.user!.id;
        });
      }
      if (repId && typeof repId === 'string' && repId !== 'all') {
        calls = calls.filter(c => c.repId === repId);
      }
    } else {
      if (repId && typeof repId === 'string' && repId !== 'all') {
        calls = calls.filter(c => c.repId === repId);
      }
    }

    if (leadId && typeof leadId === 'string') {
      calls = calls.filter(c => c.leadId === leadId);
    }

    calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    res.json(calls);
  });

  app.post('/api/calls', async (req, res) => {
    const db = await getLegacyState();
    const { leadId, duration, outcome, notes, callbackReminder, repId, repName } = req.body;

    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check if user has permission to log calls on this lead
    if (!(await can(req.securityContext!, 'leads:update', { teamId: lead.teamId, ownerId: lead.assignedRepId }))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied call log on lead ${lead.id} by ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
      return res.status(403).json({
        error: 'Forbidden: You cannot log calls for leads outside your authorized scope.',
        code: 'FORBIDDEN',
        action: 'EDIT'
      });
    }

    if (notes && !validateText(notes, 0, 2000)) {
      return res.status(400).json({ error: 'Call notes cannot exceed 2000 characters' });
    }

    // Identity Spoofing Protection:
    // Non-executive roles cannot specify another rep's repId or repName
    let callerRepId = req.user!.id;
    let callerRepName = req.user!.name;
    if (['owner', 'cto', 'it'].includes(req.user!.role) && repId) {
      callerRepId = repId;
      callerRepName = repName || db.users.find(u => u.id === repId)?.name || req.user!.name;
    }

    // Tenant-scoped compliance enforcement
    const compliance = await complianceService.checkLeadCompliance(lead, 'Call', req.securityContext!, req.tenantId);
    if (!compliance.allowed) {
      return res.status(compliance.statusCode || 403).json({
        error: compliance.reason,
        code: compliance.code,
        details: compliance.details
      });
    }

    const newCall: Call = {
      id: `call-${Date.now()}`,
      leadId,
      leadName: lead.name,
      leadPhone: lead.phone,
      repId: callerRepId,
      repName: callerRepName,
      timestamp: new Date().toISOString(),
      duration: Math.max(0, Number(duration) || 0),
      outcome: outcome || 'Follow-up',
      notes: notes ? sanitizeFormula(notes.trim()) : 'Call completed.',
      recordingSimulated: true
    };

    db.calls.unshift(newCall);

    // Update rolling attempt counter on lead
    if (!lead.contactAttempts7d) {
      lead.contactAttempts7d = { calls: 1, whatsapp: 0, sms: 0 };
    } else {
      lead.contactAttempts7d.calls = (lead.contactAttempts7d.calls || 0) + 1;
    }

    // Update lead callbackReminder and stage automatically
    if (callbackReminder !== undefined) {
      lead.callbackReminder = callbackReminder;
    }
    if (outcome === 'Converted' && lead.stage !== 'Won') {
      lead.stage = 'Won';
    } else if (outcome === 'Not interested' && lead.stage !== 'Lost') {
      lead.stage = 'Lost';
    } else if (lead.stage === 'New') {
      lead.stage = 'Contacted';
    }

    lead.version = (lead.version || 1) + 1;
    lead.updatedAt = new Date().toISOString();

    // saveDatabase(); // TODO: Migrate to repository write

    adapterLogAudit(req, 'CALL_LOGGED', `Call with ${lead.name} (${newCall.duration}s, Outcome: ${newCall.outcome})`, req.user, getClientIp(req), {
      actionType: 'EDIT'
    });
    res.json({ call: newCall, lead });
  });

  // 7. WhatsApp Messaging APIs
  app.get('/api/messages', async (req, res) => {
    const db = await getLegacyState();
    const { leadId } = req.query;
    let messages = [...db.messages];

    if (leadId && typeof leadId === 'string') {
      messages = messages.filter(m => m.leadId === leadId);
    }

    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(messages);
  });

  app.get('/api/messages/health', async (req, res) => {
    const db = await getLegacyState();
    const outbound = db.messages.filter(m => m.direction === 'outbound');
    const delivered = outbound.filter(m => m.deliveryStatus === 'Delivered').length;
    const queued = outbound.filter(m => m.deliveryStatus === 'Queued').length;
    const retrying = outbound.filter(m => m.deliveryStatus === 'Failed-Retrying').length;
    const failed = outbound.filter(m => m.deliveryStatus === 'Failed').length;
    const deliveryRate = outbound.length > 0 ? Math.round((delivered / outbound.length) * 1000) / 10 : 100;

    res.json({
      totalOutbound: outbound.length,
      delivered,
      queued,
      retrying,
      failed,
      deliveryRate
    });
  });

  app.post('/api/messages', async (req, res) => {
    const db = await getLegacyState();
    const { leadId, text, direction } = req.body;

    if (!leadId || !text) {
      return res.status(400).json({ error: 'Lead ID and text are required' });
    }

    if (!validateText(text, 1, 2000)) {
      return res.status(400).json({ error: 'Message text must be between 1 and 2000 characters' });
    }

    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const isOutbound = direction !== 'inbound';

    // Scope Authorization: Check if user has EDIT permission on this lead
    if (isOutbound) {
      if (!(await can(req.securityContext!, 'leads:update', { teamId: lead.teamId, ownerId: lead.assignedRepId }))) {
        adapterLogAudit(req, 'ACCESS_DENIED', `Denied message to lead ${lead.id} by ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
        return res.status(403).json({
          error: 'Forbidden: You cannot send messages to leads outside your authorized scope.',
          code: 'FORBIDDEN',
          action: 'EDIT'
        });
      }

      // Tenant-scoped compliance enforcement
      const compliance = await complianceService.checkLeadCompliance(lead, 'WhatsApp', req.securityContext!, req.tenantId);
      if (!compliance.allowed) {
        return res.status(compliance.statusCode || 403).json({
          error: compliance.reason,
          code: compliance.code,
          details: compliance.details
        });
      }
    }

    const willSimulateFailure = isOutbound && Math.random() < 0.12;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      leadId,
      direction: isOutbound ? 'outbound' : 'inbound',
      text: sanitizeFormula(text.trim()),
      timestamp: new Date().toISOString(),
      deliveryStatus: isOutbound ? 'Queued' : 'Delivered',
      retryCount: 0
    };

    db.messages.push(newMessage);

    if (isOutbound) {
      if (!lead.contactAttempts7d) {
        lead.contactAttempts7d = { calls: 0, whatsapp: 1, sms: 0 };
      } else {
        lead.contactAttempts7d.whatsapp = (lead.contactAttempts7d.whatsapp || 0) + 1;
      }
      lead.updatedAt = new Date().toISOString();
    }

    // saveDatabase(); // TODO: Migrate to repository write

    // Outbound state progression
    if (isOutbound) {
      setTimeout(() => {
        const msg = db.messages.find(m => m.id === newMessage.id);
        if (msg && msg.deliveryStatus === 'Queued') {
          msg.deliveryStatus = 'Sent';
          // saveDatabase(); // TODO: Migrate to repository write

          if (willSimulateFailure) {
            setTimeout(() => {
              const fMsg = db.messages.find(m => m.id === newMessage.id);
              if (fMsg) {
                fMsg.deliveryStatus = 'Failed-Retrying';
                fMsg.retryCount = 1;
                // saveDatabase(); // TODO: Migrate to repository write

                setTimeout(() => {
                  const rMsg = db.messages.find(m => m.id === newMessage.id);
                  if (rMsg) {
                    rMsg.deliveryStatus = 'Delivered';
                    rMsg.retryCount = 1;
                    // saveDatabase(); // TODO: Migrate to repository write
                  }
                }, 2500);
              }
            }, 800);
          } else {
            setTimeout(() => {
              const sMsg = db.messages.find(m => m.id === newMessage.id);
              if (sMsg && sMsg.deliveryStatus === 'Sent') {
                sMsg.deliveryStatus = 'Delivered';
                // saveDatabase(); // TODO: Migrate to repository write
              }
            }, 1200);
          }
        }
      }, 700);
    }

    adapterLogAudit(req, 'WHATSAPP_MESSAGE_QUEUED', `${isOutbound ? 'Queued outbound' : 'Received inbound'} WhatsApp message for ${lead.name}`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(newMessage);
  });

  app.post('/api/messages/simulate-reply', async (req, res) => {
    const db = await getLegacyState();
    const { leadId, customText } = req.body;
    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const replies = [
      `Namaste, thanks for sharing details. Can we connect today around 5 PM?`,
      `Yes, please send the complete quote with taxes and payment terms.`,
      `Got the brochure on WhatsApp. Looks good, let's schedule a video call with my partner.`,
      `Hi, could you clarify if this includes zero-down-payment or EMI financing options?`,
      `Thanks for following up! Received the documents.`
    ];

    const replyText = customText || replies[Math.floor(Math.random() * replies.length)];

    const incomingMsg: Message = {
      id: `msg-${Date.now()}`,
      leadId,
      direction: 'inbound',
      text: replyText,
      timestamp: new Date().toISOString(),
      deliveryStatus: 'Delivered'
    };

    db.messages.push(incomingMsg);
    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'WHATSAPP_INBOUND', `Received WhatsApp reply from lead ${lead.name}`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(incomingMsg);
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
    const { leadId, channel } = req.query;
    if (!leadId || typeof leadId !== 'string') {
      return res.status(400).json({ error: 'leadId query parameter is required' });
    }
    const targetChannel = (channel as 'Call' | 'WhatsApp' | 'SMS') || 'Call';
    const db = await getLegacyState();
    const lead = db.leads.find((l: Lead) => l.id === leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const result = await complianceService.checkLeadCompliance(lead, targetChannel, req.securityContext!, req.tenantId);
    res.json(result);
  });

  // 9. Support Tickets APIs
  app.get('/api/tickets', async (req, res) => {
    const db = await getLegacyState();
    const tickets = [...db.tickets].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    res.json(tickets);
  });

  app.post('/api/tickets', async (req, res) => {
    const db = await getLegacyState();
    const { subject, priority, leadId, initialMessage, assignedRepId } = req.body;

    if (!subject) {
      return res.status(400).json({ error: 'Ticket subject is required' });
    }

    if (!validateText(subject, 1, 200)) {
      return res.status(400).json({ error: 'Ticket subject must be between 1 and 200 characters' });
    }

    if (initialMessage && !validateText(initialMessage, 1, 5000)) {
      return res.status(400).json({ error: 'Initial message cannot exceed 5000 characters' });
    }

    const now = new Date();
    const slaDue = new Date(now.getTime() + 4 * 3600 * 1000);
    const lead = leadId ? db.leads.find(l => l.id === leadId) : undefined;

    const newTicket: Ticket = {
      id: `tkt-${Date.now()}`,
      subject: subject.trim(),
      status: 'Open',
      createdDate: now.toISOString(),
      slaDueTime: slaDue.toISOString(),
      priority: priority || 'Medium',
      leadId: leadId || undefined,
      leadName: lead ? lead.name : undefined,
      assignedRepId: assignedRepId || undefined,
      replies: initialMessage ? [
        {
          id: `rep-${Date.now()}`,
          sender: req.user!.name,
          senderRole: req.user!.role,
          text: initialMessage.trim(),
          timestamp: new Date().toISOString()
        }
      ] : []
    };

    db.tickets.unshift(newTicket);
    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'TICKET_CREATED', `Ticket opened: "${newTicket.subject}" (Priority: ${newTicket.priority})`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(newTicket);
  });

  app.post('/api/tickets/:id/replies', async (req, res) => {
    const db = await getLegacyState();
    const { id } = req.params;
    const { text, updateStatus } = req.body;

    if (!text || !validateText(text, 1, 5000)) {
      return res.status(400).json({ error: 'Reply text must be between 1 and 5000 characters' });
    }

    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const reply = {
      id: `rep-${Date.now()}`,
      sender: req.user!.name,
      senderRole: req.user!.role,
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    ticket.replies.push(reply);

    if (updateStatus && ['Open', 'In Progress', 'Resolved'].includes(updateStatus)) {
      ticket.status = updateStatus;
    } else if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'TICKET_REPLY', `Reply added to ticket #${ticket.id}`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(ticket);
  });

  app.put('/api/tickets/:id', async (req, res) => {
    const db = await getLegacyState();
    const { id } = req.params;
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { status, priority, assignedRepId } = req.body;
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedRepId) ticket.assignedRepId = assignedRepId;

    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'TICKET_UPDATED', `Ticket #${ticket.id} status updated to ${ticket.status}`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(ticket);
  });

  // 10. Reports & Analytics
  app.get('/api/reports', async (req, res) => {
    const stats = calculateReports();
    res.json(stats);
  });

  // 11. Audit Logs (Business actions)
  app.get('/api/audit-logs', async (req, res) => {
    const db = await getLegacyState();
    res.json(db.auditLogs || []);
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
    const db = await getLegacyState();
    res.json({
      customFields: db.customFields || [],
      rolePermissions: db.rolePermissions || [],
      pipelineStages: db.pipelineStages || [],
      autoAssignmentEnabled: db.autoAssignmentEnabled ?? true
    });
  });

  app.put('/api/settings/fields', async (req, res) => {
    if (!(await can(req.securityContext!, 'MANAGE_POLICY')) && req.user!.role !== 'it') {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied custom field update to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to update custom fields.', code: 'FORBIDDEN' });
    }
    const db = await getLegacyState();
    const { customFields } = req.body;
    if (Array.isArray(customFields)) {
      db.customFields = customFields;
      // saveDatabase(); // TODO: Migrate to repository write
      adapterLogAudit(req, 'CUSTOM_FIELDS_UPDATED', `Updated ${customFields.length} custom lead fields.`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
    }
    res.json({ success: true, customFields: db.customFields });
  });

  app.put('/api/settings/roles', async (req, res) => {
    if (!(await can(req.securityContext!, 'MANAGE_POLICY'))) {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied MANAGE_POLICY to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks MANAGE_POLICY permission.`,
        code: 'FORBIDDEN',
        action: 'MANAGE_POLICY'
      });
    }
    const db = await getLegacyState();
    const { rolePermissions } = req.body;
    if (Array.isArray(rolePermissions)) {
      db.rolePermissions = rolePermissions;
      // saveDatabase(); // TODO: Migrate to repository write
      adapterLogAudit(req, 'ROLE_PERMISSIONS_UPDATED', `Updated role permission matrix.`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
    }
    res.json({ success: true, rolePermissions: db.rolePermissions });
  });

  app.put('/api/settings/pipeline', async (req, res) => {
    if (!(await can(req.securityContext!, 'MANAGE_POLICY')) && req.user!.role !== 'it') {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied pipeline config update to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to update pipeline stages.', code: 'FORBIDDEN' });
    }
    const db = await getLegacyState();
    const { pipelineStages } = req.body;
    if (Array.isArray(pipelineStages)) {
      db.pipelineStages = pipelineStages;
      // saveDatabase(); // TODO: Migrate to repository write
      adapterLogAudit(req, 'PIPELINE_CONFIG_UPDATED', `Configured pipeline stages.`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
    }
    res.json({ success: true, pipelineStages: db.pipelineStages });
  });

  app.put('/api/settings/auto-assignment', async (req, res) => {
    if (!(await can(req.securityContext!, 'MANAGE_POLICY')) && req.user!.role !== 'it') {
      adapterLogAudit(req, 'ACCESS_DENIED', `Denied auto-assignment toggle to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to toggle auto-assignment.', code: 'FORBIDDEN' });
    }
    const db = await getLegacyState();
    const { enabled } = req.body;
    db.autoAssignmentEnabled = Boolean(enabled);
    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'AUTO_ASSIGNMENT_TOGGLED', `Auto round-robin lead assignment set to ${db.autoAssignmentEnabled}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
    res.json({ success: true, autoAssignmentEnabled: db.autoAssignmentEnabled });
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
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const db = await getLegacyState();
    const result = db.tenants?.map(t => {
      const tUsers = db.users.filter(u => u.tenantId === t.id).length;
      const tLeads = db.leads.filter(l => l.tenantId === t.id).length;
      
      const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
      const tCalls = db.calls.filter(c => c.tenantId === t.id && new Date(c.timestamp).getTime() >= thirtyDaysAgo).length;

      return {
        ...t,
        userCount: tUsers,
        leadCount: tLeads,
        callVolume30d: tCalls
      };
    }) || [];
    res.json(result);
  });

  app.get('/api/platform/tenants/:id', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const db = await getLegacyState();
    const t = db.tenants?.find(t => t.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Tenant not found' });

    // Aggregate metrics (no raw content)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const calls30d = db.calls.filter(c => c.tenantId === t.id && new Date(c.timestamp).getTime() >= thirtyDaysAgo);
    
    const trend = [];
    for (let i = 6; i >= 0; i--) {
       const start = new Date(Date.now() - i*24*3600*1000).setHours(0,0,0,0);
       const end = start + 24*3600*1000;
       const cCount = calls30d.filter(c => new Date(c.timestamp).getTime() >= start && new Date(c.timestamp).getTime() < end).length;
       trend.push({ date: new Date(start).toISOString().split('T')[0], calls: cCount });
    }

    const tTickets = db.tickets.filter(tk => tk.tenantId === t.id);
    const ticketsByStatus = {
      Open: tTickets.filter(tk => tk.status === 'Open').length,
      InProgress: tTickets.filter(tk => tk.status === 'In Progress').length,
      Resolved: tTickets.filter(tk => tk.status === 'Resolved').length
    };

    res.json({
      ...t,
      trend,
      ticketsByStatus
    });
  });

  app.post('/api/platform/tenants/:id/suspend', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    if (!(await can(req.securityContext!, 'platform:manage'))) {
      return res.status(403).json({ error: 'Forbidden: Requires PLATFORM_ADMIN' });
    }
    const { reason, confirmed } = req.body;
    if (!confirmed) return res.status(400).json({ error: 'Must explicitly confirm suspension' });
    if (!reason) return res.status(400).json({ error: 'Reason required for suspension' });

    const db = await getLegacyState();
    const t = db.tenants?.find(t => t.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Tenant not found' });

    t.status = 'suspended';
    t.suspendedAt = new Date().toISOString();
    t.suspensionReason = reason;

    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'TENANT_SUSPENDED', `Suspended tenant ${t.name}. Reason: ${reason}`, req.user, getClientIp(req), { tenantId: 'platform' });
    res.json({ success: true, tenant: t });
  });

  app.post('/api/platform/tenants/:id/reactivate', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    if (!(await can(req.securityContext!, 'platform:manage'))) {
      return res.status(403).json({ error: 'Forbidden: Requires PLATFORM_ADMIN' });
    }
    const { confirmed } = req.body;
    if (!confirmed) return res.status(400).json({ error: 'Must explicitly confirm reactivation' });

    const db = await getLegacyState();
    const t = db.tenants?.find(t => t.id === req.params.id);
    if (!t) return res.status(404).json({ error: 'Tenant not found' });

    t.status = 'active';
    t.suspendedAt = undefined;
    t.suspensionReason = undefined;

    // saveDatabase(); // TODO: Migrate to repository write
    adapterLogAudit(req, 'TENANT_REACTIVATED', `Reactivated tenant ${t.name}.`, req.user, getClientIp(req), { tenantId: 'platform' });
    res.json({ success: true, tenant: t });
  });

  // Step 2: Cross-tenant Security Operations Center
  app.get('/api/platform/soc/alerts', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const db = await getLegacyState();
    
    const alerts = (db.securityAlerts || []).map(a => {
       const t = db.tenants?.find(t => t.id === a.tenantId);
       return { ...a, tenantName: t?.name || a.tenantId };
    });

    const activeSessions = await db.select().from(impersonationSessions).where(eq(impersonationSessions.active, true)).execute();
    res.json({ alerts, impersonationSessions: activeSessions });
  });

  // Step 3: Impersonation
  app.post('/api/platform/impersonate', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    
    // Explicitly reject nested impersonation
    if (req.securityContext?.impersonating) {
       return res.status(403).json({ error: 'Nested impersonation is strictly forbidden. End your current session first.' });
    }

    if (!(await can(req.securityContext!, 'users:impersonate_tenant'))) {
       return res.status(403).json({ error: 'Insufficient platform role to impersonate.' });
    }

    const { targetTenantId, targetUserId, reason } = req.body;
    if (!targetTenantId) return res.status(400).json({ error: 'Target tenant ID required' });
    if (!reason || reason.trim() === '') return res.status(400).json({ error: 'Non-empty reason required' });

    const legacyDb = await getLegacyState();
    const t = legacyDb.tenants?.find(t => t.id === targetTenantId);
    if (!t) return res.status(404).json({ error: 'Target tenant not found' });

    let tUser;
    if (targetUserId) {
       tUser = legacyDb.users.find(u => u.id === targetUserId && u.tenantId === targetTenantId);
       if (!tUser) return res.status(404).json({ error: 'Target user not found in this tenant' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 60 minutes expiry

    const session = {
      id: `imp-${crypto.randomUUID()}`,
      platformUserId: req.user!.id,
      platformUserName: req.user!.name,
      platformUserRole: req.user!.role,
      targetTenantId,
      targetTenantName: t.name,
      targetUserId: tUser?.id || '',
      targetUserName: tUser?.name || 'Tenant Admin Default',
      targetUserRole: tUser?.role || 'owner',
      reason,
      startedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      active: true,
      ip: getClientIp(req)
    };

    // Deactivate previous sessions for this user
    await db.update(impersonationSessions)
      .set({ active: false, endedAt: now.toISOString() })
      .where(
        and(
          eq(impersonationSessions.platformUserId, req.user!.id),
          eq(impersonationSessions.active, true)
        )
      );

    // Insert new session
    await db.insert(impersonationSessions).values(session);

    adapterLogAudit(req, 'IMPERSONATION_STARTED', `Started impersonating ${t.name}. Reason: ${reason}`, req.user, getClientIp(req), { tenantId: 'platform' });
    res.json({ success: true, session });
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
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const db = await getLegacyState();
    
    const tenants = db.tenants || [];
    const rates: Record<string, number> = {
      trial: 0,
      starter: 5000,
      growth: 15000,
      enterprise: 50000
    };

    let totalMRR = 0;
    const tierCounts = { trial: 0, starter: 0, growth: 0, enterprise: 0 };
    
    tenants.forEach(t => {
      if (t.status === 'active') {
         const tier = t.tier || 'starter';
         totalMRR += rates[tier] || 0;
         if (tierCounts[tier] !== undefined) tierCounts[tier]++;
      }
    });

    const records = db.billingRecords || [];
    const invoicesWithNames = records.map(r => {
       const t = tenants.find(t => t.id === r.tenantId);
       return { ...r, tenantName: t?.name || r.tenantId };
    }).sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    const prioritizedInvoices = invoicesWithNames.filter(r => r.status === 'overdue' || r.status === 'failed');
    
    res.json({
       totalMRR,
       tierCounts,
       prioritizedInvoices,
       allInvoices: invoicesWithNames
    });
  });

  app.post('/api/platform/billing/:id/mark-paid', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    if (!(await can(req.securityContext!, 'platform:manage'))) {
      return res.status(403).json({ error: 'Forbidden: Requires PLATFORM_ADMIN' });
    }

    const db = await getLegacyState();
    const inv = db.billingRecords?.find(b => b.id === req.params.id);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    
    inv.status = 'paid';
    inv.paidAt = new Date().toISOString();
    // saveDatabase(); // TODO: Migrate to repository write
    
    adapterLogAudit(req, 'INVOICE_PAID', `Marked invoice ${inv.invoiceId} for ${inv.tenantId} as paid.`, req.user, getClientIp(req), { tenantId: 'platform' });
    res.json({ success: true, invoice: inv });
  });

  // Step 5: Feature-flag / release control
  app.get('/api/platform/features', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    const db = await getLegacyState();
    res.json(db.featureFlags || []);
  });

  app.put('/api/platform/features/:id', async (req, res) => {
    if (!req.isPlatformStaff) return res.status(403).json({ error: 'Forbidden' });
    if (!(await can(req.securityContext!, 'platform:manage'))) {
      return res.status(403).json({ error: 'Forbidden: Requires PLATFORM_ADMIN' });
    }

    const db = await getLegacyState();
    const flag = db.featureFlags?.find(f => f.id === req.params.id);
    if (!flag) return res.status(404).json({ error: 'Feature flag not found' });

    const oldState = { ...flag };
    const { enabledGlobally, enabledForTenantIds, rolloutPercentage } = req.body;
    
    if (enabledGlobally !== undefined) flag.enabledGlobally = enabledGlobally;
    if (enabledForTenantIds !== undefined) flag.enabledForTenantIds = enabledForTenantIds;
    if (rolloutPercentage !== undefined) flag.rolloutPercentage = rolloutPercentage;

    // saveDatabase(); // TODO: Migrate to repository write
    
    adapterLogAudit(req, 'FEATURE_FLAG_UPDATED', `Updated flag ${flag.key} from G:${oldState.enabledGlobally} to G:${flag.enabledGlobally}`, req.user, getClientIp(req), { tenantId: 'platform' });
    res.json({ success: true, flag });
  });

  // Helper endpoint to check a flag for a specific tenant (can be called by frontend)
  app.get('/api/features/check', async (req, res) => {
    const { key, tenantId } = req.query;
    if (!key || !tenantId) return res.status(400).json({ error: 'key and tenantId required' });
    
    const db = await getLegacyState();
    const flag = db.featureFlags?.find(f => f.key === key);
    if (!flag) return res.json({ enabled: false });

    if (flag.enabledForTenantIds?.includes(tenantId as string)) {
       return res.json({ enabled: true });
    }
    
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage > 0) {
       const hashStr = `${tenantId}-${key}`;
       let hash = 0;
       for (let i = 0; i < hashStr.length; i++) {
          hash = ((hash << 5) - hash) + hashStr.charCodeAt(i);
          hash |= 0;
       }
       const val = Math.abs(hash) % 100;
       if (val < flag.rolloutPercentage) return res.json({ enabled: true });
    }

    res.json({ enabled: flag.enabledGlobally });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Mount generic error handler at the end
  app.use(globalErrorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    logger.info('Server started', { port: PORT });
  });
}

startServer().catch(err => {
  logger.fatal('Failed to start server', err);
  process.exit(1);
});
