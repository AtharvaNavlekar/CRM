import express from 'express';
import path from 'path';
import crypto from 'crypto';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  loadDatabase,
  getDb,
  saveDatabase,
  logAudit,
  createBackup,
  restoreBackup,
  resetDatabase,
  calculateReports,
  sanitizeUser,
  getComplianceRules,
  updateComplianceRules,
  DEFAULT_FREQUENCY_RULES
} from './server/db';
import {
  checkCompliance,
  validateLeadCommunicationCompliance,
  isQuietHours,
  ComplianceCheckResult
} from './server/compliance';
import {
  authenticateToken,
  checkUserPermission,
  requirePermission,
  requireRole,
  authorize,
  actionRequiresApproval,
  getRolePermission,
  JWT_SECRET,
  JWT_EXPIRY,
  revokedTokens,
  revokeToken,
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken
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
import { TEAMS } from './server/seedData';
import {
  AI_CRAWLER_USER_AGENTS,
  isAiCrawler,
  logBlockedCrawlerAttempt,
  getRecentCrawlerBlocks,
  generateRobotsTxtContent,
  getAiCrawlerBlockHtml
} from './server/crawlerAgents';

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for reverse proxy environments (Cloud Run, Nginx)
  app.set('trust proxy', 1);

  const getClientIp = (req: express.Request) => {
    return (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  };

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
  app.get('/robots.txt', (req, res) => {
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

  // Brute-force Login Rate Limiter
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const ip = req.socket.remoteAddress || '127.0.0.1';
      const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : 'unknown';
      return `${ip}|${email}`;
    },
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
  });

  // 2. Global Authentication Middleware (validates JWT tokens in Authorization header)
  app.use('/api', authenticateToken);


  // Health API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'DialPulse CRM API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // 3. Auth Routes
  app.post('/api/auth/login', loginLimiter, (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = bcryptjs.compareSync(String(password), user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, type: 'access', jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, type: 'refresh', jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAudit('USER_LOGIN', `${user.name} logged into DialPulse CRM`, { id: user.id, name: user.name, role: user.role }, getClientIp(req));
    res.json({ user: sanitizeUser(user), token, refreshToken, expiresIn: 3600 });
  });

  app.post('/api/auth/refresh', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ error: 'Refresh token is required', code: 'REFRESH_TOKEN_REQUIRED' });
    }

    if (revokedTokens.has(refreshToken)) {
      return res.status(401).json({ error: 'Refresh token has been revoked. Please log in again.', code: 'TOKEN_REVOKED' });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as { id: string; email: string; type?: string };
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid token type. Expected refresh token.', code: 'INVALID_TOKEN' });
      }

      const db = getDb();
      const user = db.users.find(u => u.id === decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User account not found or deactivated.', code: 'USER_NOT_FOUND' });
      }

      const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role, type: 'access', jti: crypto.randomUUID() },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY as any }
      );

      res.json({ token: newToken, user: sanitizeUser(user) });
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token has expired. Please log in again.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Invalid refresh token.', code: 'INVALID_TOKEN' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    const db = getDb();
    const user = db.users.find(u => u.id === req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: sanitizeUser(user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.user?.token) {
      revokedTokens.add(req.user.token);
    }
    if (req.body?.refreshToken && typeof req.body.refreshToken === 'string') {
      revokedTokens.add(req.body.refreshToken);
    }
    logAudit('USER_LOGOUT', `${req.user?.name} signed out`, { id: req.user?.id, name: req.user?.name, role: req.user?.role }, getClientIp(req));
    res.json({ success: true, message: 'Successfully logged out' });
  });

  // User Switching / Role Updating
  // Persona switching and testing (supports all 6 RBAC roles: telecaller, tl, tl_head, it, owner, cto)
  app.post('/api/auth/switch-user', (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to switch user.', code: 'UNAUTHORIZED' });
    }

    if (req.user.role !== 'owner' && req.user.role !== 'cto') {
      return res.status(403).json({ error: 'Only owners and CTOs can use the impersonation endpoint.', code: 'FORBIDDEN' });
    }

    const { userId, role } = req.body;
    const db = getDb();
    let targetUser = userId ? db.users.find(u => u.id === userId) : db.users.find(u => u.id === req.user!.id);
    if (!targetUser) {
      targetUser = db.users[0];
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const validRoles: UserRole[] = ['telecaller', 'tl', 'tl_head', 'it', 'owner', 'cto'];
    let mappedRole = role as UserRole;
    if (mappedRole === ('Rep' as any)) mappedRole = 'telecaller';
    if (mappedRole === ('Team Lead' as any)) mappedRole = 'tl';
    if (mappedRole === ('Admin' as any)) mappedRole = 'owner';

    if (role && validRoles.includes(mappedRole)) {
      targetUser.role = mappedRole;
      saveDatabase();
      logAudit(
        'ROLE_UPDATED',
        `${req.user.name} switched role of ${targetUser.name} to ${mappedRole}`,
        { id: targetUser.id, name: targetUser.name, role: targetUser.role },
        getClientIp(req),
        { actionType: 'MANAGE_USERS' }
      );
    } else {
      logAudit(
        'USER_SWITCH',
        `Switched active persona to ${targetUser.name} (${targetUser.role})`,
        { id: targetUser.id, name: targetUser.name, role: targetUser.role },
        getClientIp(req)
      );
    }

    const token = jwt.sign(
      { id: targetUser.id, email: targetUser.email, role: targetUser.role, type: 'access', jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      { id: targetUser.id, email: targetUser.email, type: 'refresh', jti: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ user: sanitizeUser(targetUser), token, refreshToken });
  });

  // Teams Directory API (Mumbai & Delhi)
  app.get('/api/teams', (req, res) => {
    res.json(TEAMS);
  });

  // 4. User Directory APIs
  app.get('/api/users', (req, res) => {
    const db = getDb();
    res.json(db.users.map(sanitizeUser));
  });

  // Account creation is gated by MANAGE_USERS permission
  app.post('/api/users', (req, res) => {
    if (!authorize(req.user!, 'MANAGE_USERS', {})) {
      logAudit('ACCESS_DENIED', `Denied MANAGE_USERS to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_USERS' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks MANAGE_USERS permission.`,
        code: 'FORBIDDEN',
        action: 'MANAGE_USERS'
      });
    }

    const { name, email, role, title, phone, password, teamId, managesTeamIds } = req.body;
    const db = getDb();

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

    const defaultTitle: Record<UserRole, string> = {
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
    saveDatabase();
    logAudit('USER_INVITED', `${req.user!.name} created user ${newUser.name} with role ${newUser.role}`, req.user, getClientIp(req), { actionType: 'MANAGE_USERS' });
    res.json(sanitizeUser(newUser));
  });

  // 5. Leads APIs
  app.get('/api/leads', (req, res) => {
    const db = getDb();
    const { repId, source, stage, search } = req.query;
    let leads = [...db.leads];

    // Server-enforced scope filtering via authorize()
    leads = leads.filter(l => authorize(req.user!, 'VIEW', { teamId: l.teamId, ownerId: l.assignedRepId }));

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

  // Single Lead Inspection (gated by VIEW authorization on lead scope)
  app.get('/api/leads/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const lead = db.leads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!authorize(req.user!, 'VIEW', { teamId: lead.teamId, ownerId: lead.assignedRepId })) {
      logAudit('ACCESS_DENIED', `Denied VIEW for lead ${lead.id} to ${req.user!.name}`, req.user, getClientIp(req), {
        actionType: 'VIEW',
        scope: getRolePermission(req.user!.role)?.scope
      });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' cannot view lead outside authorized scope.`,
        code: 'FORBIDDEN',
        action: 'VIEW'
      });
    }

    res.json(lead);
  });

  // Data Export API (gated by EXPORT permission and approval workflow)
  app.get('/api/leads/export', (req, res) => {
    const db = getDb();
    if (!authorize(req.user!, 'EXPORT', {})) {
      logAudit('ACCESS_DENIED', `Denied EXPORT to ${req.user!.name} (${req.user!.role})`, req.user, getClientIp(req), { actionType: 'EXPORT' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks EXPORT permission.`,
        code: 'FORBIDDEN',
        action: 'EXPORT'
      });
    }

    const requiresApproval = actionRequiresApproval(req.user!, 'EXPORT');
    if (requiresApproval && req.query.confirmed !== 'true') {
      return res.status(202).json({
        requiresApproval: true,
        action: 'EXPORT',
        message: 'Exporting customer records requires explicit confirmation. All exports are recorded in the security audit trail.',
        warning: 'High-impact data export requires explicit confirmation.'
      });
    }

    let leads = [...db.leads];
    // Filter exported leads strictly to authorized view scope
    leads = leads.filter(l => authorize(req.user!, 'VIEW', { teamId: l.teamId, ownerId: l.assignedRepId }));

    const format = req.query.format === 'json' ? 'json' : 'csv';
    if (format === 'json') {
      logAudit('DATA_EXPORT', `Exported ${leads.length} leads in JSON format`, req.user, getClientIp(req), {
        actionType: 'EXPORT',
        requiredApproval: requiresApproval
      });
      return res.json(leads);
    }

    // CSV format with formula neutralization
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Source', 'Stage', 'Team', 'Assigned Rep', 'Value (INR)', 'Created Date', 'Notes'];
    const rows = leads.map(l => [
      l.id,
      sanitizeFormula(l.name),
      sanitizeFormula(l.phone),
      sanitizeFormula(l.email || ''),
      l.source,
      l.stage,
      l.teamId || '',
      l.assignedRepName,
      l.value || 0,
      l.createdDate,
      sanitizeFormula(l.notes || '')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    logAudit('DATA_EXPORT', `Exported ${leads.length} leads in CSV format`, req.user, getClientIp(req), {
      actionType: 'EXPORT',
      requiredApproval: requiresApproval
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dialpulse_leads_${Date.now()}.csv"`);
    res.send(csvContent);
  });

  app.post('/api/leads', (req, res) => {
    const db = getDb();
    if (!authorize(req.user!, 'EDIT', {})) {
      logAudit('ACCESS_DENIED', `Denied lead creation for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
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
    saveDatabase();

    logAudit('LEAD_CREATED', `Added new lead: ${newLead.name} (${newLead.source}) assigned to ${newLead.assignedRepName} [${leadTeamId}]`, req.user, getClientIp(req), {
      actionType: 'EDIT'
    });
    res.json(newLead);
  });

  // Optimistic Concurrency Update with Scope Authorization & Reassignment Control
  app.put('/api/leads/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const index = db.leads.findIndex(l => l.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const oldLead = db.leads[index];
    const updates = req.body;

    // Scope & Action Check: Can user EDIT this lead?
    if (!authorize(req.user!, 'EDIT', { teamId: oldLead.teamId, ownerId: oldLead.assignedRepId })) {
      logAudit('ACCESS_DENIED', `Denied EDIT on lead ${oldLead.id} for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
      return res.status(403).json({
        error: `Forbidden: You do not have permission to edit lead "${oldLead.name}".`,
        code: 'FORBIDDEN',
        action: 'EDIT'
      });
    }

    // Reassignment Check: Can user REASSIGN this lead?
    const isReassigning = updates.assignedRepId && updates.assignedRepId !== oldLead.assignedRepId;
    if (isReassigning) {
      if (!authorize(req.user!, 'REASSIGN', { teamId: oldLead.teamId, ownerId: oldLead.assignedRepId })) {
        logAudit('ACCESS_DENIED', `Denied REASSIGN on lead ${oldLead.id} for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'REASSIGN' });
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
        logAudit('LEAD_REASSIGNED', `Lead ${oldLead.name} reassigned from ${oldLead.assignedRepName} to ${targetRep.name}`, req.user, getClientIp(req), { actionType: 'REASSIGN' });
      }
    }

    // Approval check for EDIT (e.g. owner and cto roles have EDIT in requiresApproval)
    const requiresApproval = actionRequiresApproval(req.user!, 'EDIT');
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
      logAudit('LEAD_STAGE_CHANGED', `${oldLead.name} moved from ${oldLead.stage} to ${updates.stage}`, req.user, getClientIp(req), { actionType: 'EDIT' });
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
    saveDatabase();
    logAudit('LEAD_UPDATED', `Lead ${oldLead.name} updated`, req.user, getClientIp(req), {
      actionType: 'EDIT',
      requiredApproval: requiresApproval
    });
    res.json(updatedLead);
  });

  // Lead deletion gated by DELETE permission and approval workflow
  app.delete('/api/leads/:id', (req, res) => {
    if (!authorize(req.user!, 'DELETE', {})) {
      logAudit('ACCESS_DENIED', `Denied DELETE on lead for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'DELETE' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks permission to delete leads.`,
        code: 'FORBIDDEN',
        action: 'DELETE'
      });
    }

    const db = getDb();
    const { id } = req.params;
    const lead = db.leads.find(l => l.id === id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!authorize(req.user!, 'DELETE', { teamId: lead.teamId, ownerId: lead.assignedRepId })) {
      logAudit('ACCESS_DENIED', `Denied DELETE on lead ${lead.id} for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'DELETE' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks DELETE permission for lead "${lead.name}".`,
        code: 'FORBIDDEN',
        action: 'DELETE'
      });
    }

    const requiresApproval = actionRequiresApproval(req.user!, 'DELETE');
    if (requiresApproval && req.body?.confirmed !== true && req.query?.confirmed !== 'true') {
      return res.status(202).json({
        requiresApproval: true,
        action: 'DELETE',
        message: `You are about to permanently delete lead "${lead.name}". This action is logged and cannot be undone. Confirm?`,
        warning: 'Permanent lead deletion requires explicit confirmation.'
      });
    }

    db.leads = db.leads.filter(l => l.id !== id);
    saveDatabase();
    logAudit('LEAD_DELETED', `Deleted lead record for ${lead.name}`, req.user, getClientIp(req), {
      actionType: 'DELETE',
      requiredApproval: requiresApproval
    });
    res.json({ success: true, id });
  });

  // Bulk import leads from CSV (gated by EDIT authorization)
  app.post('/api/leads/import', (req, res) => {
    if (!authorize(req.user!, 'EDIT', {})) {
      logAudit('ACCESS_DENIED', `Denied lead CSV import for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks permission to import leads.`,
        code: 'FORBIDDEN',
        action: 'EDIT'
      });
    }

    const db = getDb();
    const { leads: rawLeads } = req.body;
    if (!Array.isArray(rawLeads) || rawLeads.length === 0) {
      return res.status(400).json({ error: 'No valid leads provided for import' });
    }

    if (rawLeads.length > 250) {
      return res.status(400).json({
        error: `Batch size exceeds limit of 250 records per import request (received ${rawLeads.length}). Please split into smaller batches.`,
        code: 'BATCH_SIZE_EXCEEDED',
        maxBatchSize: 250
      });
    }

    const reps = db.users.filter(u => u.role === 'telecaller' || u.role === 'tl');
    const defaultRep = reps[0] || db.users[0];
    const importedLeads: Lead[] = [];
    const nowIso = new Date().toISOString();

    rawLeads.forEach((item: any, idx: number) => {
      if (!item.name && !item.phone) return;
      const rep = reps[idx % reps.length] || defaultRep;
      const newLead: Lead = {
        id: `lead-${Date.now()}-${idx}`,
        name: sanitizeFormula((item.name || 'Unnamed Lead').trim()),
        phone: sanitizeFormula((item.phone || '+91 98000 00000').trim()),
        source: item.source || 'Manual',
        stage: item.stage || 'New',
        teamId: rep.teamId || req.user!.teamId || 'team-mumbai',
        assignedRepId: rep.id,
        assignedRepName: rep.name,
        createdDate: nowIso,
        updatedAt: nowIso,
        version: 1,
        notes: sanitizeFormula(item.notes || 'Imported via CSV batch upload.'),
        industry: item.industry || 'Real Estate',
        value: Number(item.value) || 1000000,
        callbackReminder: null
      };
      importedLeads.push(newLead);
      db.leads.unshift(newLead);
    });

    saveDatabase();
    logAudit('CSV_BULK_IMPORT', `Imported ${importedLeads.length} leads via CSV batch upload.`, req.user, getClientIp(req), { actionType: 'EDIT' });
    res.json({ count: importedLeads.length, importedLeads });
  });

  // Bulk edit (gated by EDIT & REASSIGN authorizations, restricted to Team Lead and Admin roles)
  app.post('/api/leads/bulk-update', (req, res) => {
    if (req.user!.role === 'telecaller' || (req.user!.role as any) === 'Rep') {
      logAudit('ACCESS_DENIED', `Denied bulk-update for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
      return res.status(403).json({
        error: 'Forbidden: Bulk updates are restricted to Team Lead and Admin roles.',
        code: 'FORBIDDEN'
      });
    }

    const db = getDb();
    const { leadIds, stage, assignedRepId } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array is required' });
    }

    const isReassigning = Boolean(assignedRepId);
    const assignedUser = assignedRepId ? db.users.find(u => u.id === assignedRepId) : null;

    // Validate permission on all targeted leads
    for (const l of db.leads) {
      if (leadIds.includes(l.id)) {
        if (!authorize(req.user!, 'EDIT', { teamId: l.teamId, ownerId: l.assignedRepId })) {
          logAudit('ACCESS_DENIED', `Denied bulk EDIT on lead ${l.id} for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
          return res.status(403).json({
            error: `Forbidden: You do not have EDIT permission for lead ${l.name}.`,
            code: 'FORBIDDEN',
            action: 'EDIT'
          });
        }
        if (isReassigning && !authorize(req.user!, 'REASSIGN', { teamId: l.teamId, ownerId: l.assignedRepId })) {
          logAudit('ACCESS_DENIED', `Denied bulk REASSIGN on lead ${l.id} for ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'REASSIGN' });
          return res.status(403).json({
            error: `Forbidden: Current role lacks REASSIGN permission for lead ${l.name}.`,
            code: 'FORBIDDEN',
            action: 'REASSIGN'
          });
        }
      }
    }

    let count = 0;
    const nowIso = new Date().toISOString();

    db.leads.forEach(l => {
      if (leadIds.includes(l.id)) {
        if (stage) l.stage = stage;
        if (assignedUser) {
          l.assignedRepId = assignedUser.id;
          l.assignedRepName = assignedUser.name;
          if (assignedUser.teamId) {
            l.teamId = assignedUser.teamId;
          }
        }
        l.version = (l.version || 1) + 1;
        l.updatedAt = nowIso;
        count++;
      }
    });

    saveDatabase();
    logAudit('BULK_LEAD_UPDATE', `Bulk updated ${count} leads${stage ? ' -> ' + stage : ''}${assignedUser ? ' -> Rep ' + assignedUser.name : ''}`, req.user, getClientIp(req), {
      actionType: isReassigning ? 'REASSIGN' : 'EDIT'
    });
    res.json({ success: true, count });
  });

  // 6. Calls APIs
  app.get('/api/calls', (req, res) => {
    const db = getDb();
    const { leadId, repId } = req.query;
    let calls = [...db.calls];

    // Scope-aware call log filtering based on user RBAC scope
    const userRole = req.user!.role;
    const perm = getRolePermission(userRole);
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

  app.post('/api/calls', (req, res) => {
    const db = getDb();
    const { leadId, duration, outcome, notes, callbackReminder, repId, repName } = req.body;

    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check if user has permission to log calls on this lead
    if (!authorize(req.user!, 'EDIT', { teamId: lead.teamId, ownerId: lead.assignedRepId })) {
      logAudit('ACCESS_DENIED', `Denied call log on lead ${lead.id} by ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
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

    // Shared Server-Side Lead Communication Compliance Enforcement
    const compliance = validateLeadCommunicationCompliance(lead, 'Call', { db });
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

    saveDatabase();

    logAudit('CALL_LOGGED', `Call with ${lead.name} (${newCall.duration}s, Outcome: ${newCall.outcome})`, req.user, getClientIp(req), {
      actionType: 'EDIT'
    });
    res.json({ call: newCall, lead });
  });

  // 7. WhatsApp Messaging APIs
  app.get('/api/messages', (req, res) => {
    const db = getDb();
    const { leadId } = req.query;
    let messages = [...db.messages];

    if (leadId && typeof leadId === 'string') {
      messages = messages.filter(m => m.leadId === leadId);
    }

    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(messages);
  });

  app.get('/api/messages/health', (req, res) => {
    const db = getDb();
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

  app.post('/api/messages', (req, res) => {
    const db = getDb();
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
      if (!authorize(req.user!, 'EDIT', { teamId: lead.teamId, ownerId: lead.assignedRepId })) {
        logAudit('ACCESS_DENIED', `Denied message to lead ${lead.id} by ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'EDIT' });
        return res.status(403).json({
          error: 'Forbidden: You cannot send messages to leads outside your authorized scope.',
          code: 'FORBIDDEN',
          action: 'EDIT'
        });
      }

      // Shared Server-Side Lead Communication Compliance Enforcement
      const compliance = validateLeadCommunicationCompliance(lead, 'WhatsApp', { db });
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

    saveDatabase();

    // Outbound state progression
    if (isOutbound) {
      setTimeout(() => {
        const msg = db.messages.find(m => m.id === newMessage.id);
        if (msg && msg.deliveryStatus === 'Queued') {
          msg.deliveryStatus = 'Sent';
          saveDatabase();

          if (willSimulateFailure) {
            setTimeout(() => {
              const fMsg = db.messages.find(m => m.id === newMessage.id);
              if (fMsg) {
                fMsg.deliveryStatus = 'Failed-Retrying';
                fMsg.retryCount = 1;
                saveDatabase();

                setTimeout(() => {
                  const rMsg = db.messages.find(m => m.id === newMessage.id);
                  if (rMsg) {
                    rMsg.deliveryStatus = 'Delivered';
                    rMsg.retryCount = 1;
                    saveDatabase();
                  }
                }, 2500);
              }
            }, 800);
          } else {
            setTimeout(() => {
              const sMsg = db.messages.find(m => m.id === newMessage.id);
              if (sMsg && sMsg.deliveryStatus === 'Sent') {
                sMsg.deliveryStatus = 'Delivered';
                saveDatabase();
              }
            }, 1200);
          }
        }
      }, 700);
    }

    logAudit('WHATSAPP_MESSAGE_QUEUED', `${isOutbound ? 'Queued outbound' : 'Received inbound'} WhatsApp message for ${lead.name}`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(newMessage);
  });

  app.post('/api/messages/simulate-reply', (req, res) => {
    const db = getDb();
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
    saveDatabase();
    logAudit('WHATSAPP_INBOUND', `Received WhatsApp reply from lead ${lead.name}`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(incomingMsg);
  });

  // 8. Compliance Rules & Verification APIs
  app.get('/api/compliance/rules', (req, res) => {
    const rules = getComplianceRules();
    res.json(rules);
  });

  app.put('/api/compliance/rules', (req, res) => {
    if (!authorize(req.user!, 'MANAGE_COMPLIANCE_RULES', {})) {
      logAudit('ACCESS_DENIED', `Denied MANAGE_COMPLIANCE_RULES to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_COMPLIANCE_RULES' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks MANAGE_COMPLIANCE_RULES permission.`,
        code: 'FORBIDDEN',
        action: 'MANAGE_COMPLIANCE_RULES'
      });
    }

    const requiresApproval = actionRequiresApproval(req.user!, 'MANAGE_COMPLIANCE_RULES');
    if (requiresApproval && req.body.confirmed !== true) {
      return res.status(202).json({
        requiresApproval: true,
        action: 'MANAGE_COMPLIANCE_RULES',
        message: 'Updating calling compliance rules affects company-wide TRAI frequency caps and quiet hours. Confirm update?',
        warning: 'Compliance rule update requires explicit confirmation.'
      });
    }

    const updates = req.body;
    const updated = updateComplianceRules(updates);
    logAudit('COMPLIANCE_RULES_UPDATED', `Updated compliance frequency & quiet hours rules`, req.user, getClientIp(req), {
      actionType: 'MANAGE_COMPLIANCE_RULES',
      requiredApproval: requiresApproval
    });
    res.json({ success: true, rules: updated });
  });

  app.get('/api/compliance/check', (req, res) => {
    const { leadId, channel } = req.query;
    if (!leadId || typeof leadId !== 'string') {
      return res.status(400).json({ error: 'leadId query parameter is required' });
    }
    const targetChannel = (channel as 'Call' | 'WhatsApp' | 'SMS') || 'Call';
    const db = getDb();
    const lead = db.leads.find(l => l.id === leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    const result = checkCompliance(lead, targetChannel, { db });
    res.json(result);
  });

  // 9. Support Tickets APIs
  app.get('/api/tickets', (req, res) => {
    const db = getDb();
    const tickets = [...db.tickets].sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    res.json(tickets);
  });

  app.post('/api/tickets', (req, res) => {
    const db = getDb();
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
          timestamp: now.toISOString()
        }
      ] : []
    };

    db.tickets.unshift(newTicket);
    saveDatabase();
    logAudit('TICKET_CREATED', `Ticket opened: "${newTicket.subject}" (Priority: ${newTicket.priority})`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(newTicket);
  });

  app.post('/api/tickets/:id/replies', (req, res) => {
    const db = getDb();
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

    saveDatabase();
    logAudit('TICKET_REPLY', `Reply added to ticket #${ticket.id}`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(ticket);
  });

  app.put('/api/tickets/:id', (req, res) => {
    const db = getDb();
    const { id } = req.params;
    const ticket = db.tickets.find(t => t.id === id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const { status, priority, assignedRepId } = req.body;
    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedRepId) ticket.assignedRepId = assignedRepId;

    saveDatabase();
    logAudit('TICKET_UPDATED', `Ticket #${ticket.id} status updated to ${ticket.status}`, { id: req.user!.id, name: req.user!.name, role: req.user!.role }, getClientIp(req));
    res.json(ticket);
  });

  // 10. Reports & Analytics
  app.get('/api/reports', (req, res) => {
    const stats = calculateReports();
    res.json(stats);
  });

  // 11. Audit Logs (Business actions)
  app.get('/api/audit-logs', (req, res) => {
    const db = getDb();
    res.json(db.auditLogs || []);
  });

  // Dedicated Infrastructure Telemetry: Blocked AI Crawler attempts (separate from business audit log)
  app.get('/api/crawler-telemetry', (req, res) => {
    if (!['owner', 'cto', 'it', 'Admin'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to view infrastructure telemetry.' });
    }
    const blocks = getRecentCrawlerBlocks(100);
    res.json({ count: blocks.length, blocks });
  });

  // 12. Automated Backups & Snapshots
  app.get('/api/backups', (req, res) => {
    const db = getDb();
    res.json(db.backups || []);
  });

  app.post('/api/backups', (req, res) => {
    if (!['owner', 'cto', 'it', 'tl_head', 'tl'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to create system backups.', code: 'FORBIDDEN' });
    }
    const { name } = req.body;
    const record = createBackup(
      name || `Manual Snapshot ${new Date().toLocaleTimeString('en-IN')}`,
      false,
      { id: req.user!.id, name: req.user!.name, role: req.user!.role }
    );
    res.json(record);
  });

  // Admin & IT restore
  app.post('/api/backups/:id/restore', (req, res) => {
    if (!['owner', 'cto', 'it'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden: Only Owner, CTO, or IT administrators can restore backups.', code: 'FORBIDDEN' });
    }
    const { id } = req.params;
    const success = restoreBackup(id, { id: req.user!.id, name: req.user!.name, role: req.user!.role });
    if (!success) {
      return res.status(400).json({ error: 'Backup file not found or corrupted' });
    }
    res.json({ success: true, message: 'Database restored successfully' });
  });

  // Database Reset (Owner, CTO, IT only)
  app.post('/api/reset-data', (req, res) => {
    if (!['owner', 'cto', 'it'].includes(req.user!.role)) {
      return res.status(403).json({ error: 'Forbidden: Only Owner, CTO, or IT administrators can reset database.', code: 'FORBIDDEN' });
    }
    const newState = resetDatabase({ id: req.user!.id, name: req.user!.name, role: req.user!.role });
    res.json({ success: true, message: 'Sample Indian SMB data reset successfully', state: newState });
  });

  // 14. Settings APIs (Custom Fields, Role Permissions, Pipeline, Auto-Assignment)
  app.get('/api/settings', (req, res) => {
    const db = getDb();
    res.json({
      customFields: db.customFields || [],
      rolePermissions: db.rolePermissions || [],
      pipelineStages: db.pipelineStages || [],
      autoAssignmentEnabled: db.autoAssignmentEnabled ?? true
    });
  });

  app.put('/api/settings/fields', (req, res) => {
    if (!authorize(req.user!, 'MANAGE_POLICY', {}) && req.user!.role !== 'it') {
      logAudit('ACCESS_DENIED', `Denied custom field update to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to update custom fields.', code: 'FORBIDDEN' });
    }
    const db = getDb();
    const { customFields } = req.body;
    if (Array.isArray(customFields)) {
      db.customFields = customFields;
      saveDatabase();
      logAudit('CUSTOM_FIELDS_UPDATED', `Updated ${customFields.length} custom lead fields.`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
    }
    res.json({ success: true, customFields: db.customFields });
  });

  app.put('/api/settings/roles', (req, res) => {
    if (!authorize(req.user!, 'MANAGE_POLICY', {})) {
      logAudit('ACCESS_DENIED', `Denied MANAGE_POLICY to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
      return res.status(403).json({
        error: `Forbidden: Current role '${req.user!.role}' lacks MANAGE_POLICY permission.`,
        code: 'FORBIDDEN',
        action: 'MANAGE_POLICY'
      });
    }
    const db = getDb();
    const { rolePermissions } = req.body;
    if (Array.isArray(rolePermissions)) {
      db.rolePermissions = rolePermissions;
      saveDatabase();
      logAudit('ROLE_PERMISSIONS_UPDATED', `Updated role permission matrix.`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
    }
    res.json({ success: true, rolePermissions: db.rolePermissions });
  });

  app.put('/api/settings/pipeline', (req, res) => {
    if (!authorize(req.user!, 'MANAGE_POLICY', {}) && req.user!.role !== 'it') {
      logAudit('ACCESS_DENIED', `Denied pipeline config update to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to update pipeline stages.', code: 'FORBIDDEN' });
    }
    const db = getDb();
    const { pipelineStages } = req.body;
    if (Array.isArray(pipelineStages)) {
      db.pipelineStages = pipelineStages;
      saveDatabase();
      logAudit('PIPELINE_CONFIG_UPDATED', `Configured pipeline stages.`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
    }
    res.json({ success: true, pipelineStages: db.pipelineStages });
  });

  app.put('/api/settings/auto-assignment', (req, res) => {
    if (!authorize(req.user!, 'MANAGE_POLICY', {}) && req.user!.role !== 'it') {
      logAudit('ACCESS_DENIED', `Denied auto-assignment toggle to ${req.user!.name}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges to toggle auto-assignment.', code: 'FORBIDDEN' });
    }
    const db = getDb();
    const { enabled } = req.body;
    db.autoAssignmentEnabled = Boolean(enabled);
    saveDatabase();
    logAudit('AUTO_ASSIGNMENT_TOGGLED', `Auto round-robin lead assignment set to ${db.autoAssignmentEnabled}`, req.user, getClientIp(req), { actionType: 'MANAGE_POLICY' });
    res.json({ success: true, autoAssignmentEnabled: db.autoAssignmentEnabled });
  });

  // 15. Audio Transcription API with model gemini-3.5-transcribe
  app.post('/api/transcribe', async (req, res) => {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 string is required.' });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const audioMime = mimeType || 'audio/webm';

    try {
      if (!GEMINI_API_KEY) {
        // Fallback when GEMINI_API_KEY is not configured
        const sampleTranscripts = [
          "Spoke with the lead regarding the premium 3-BHK configuration. Customer requested the cost breakdown and WhatsApp brochure. Follow-up scheduled for tomorrow at 4 PM.",
          "Lead answered while travelling; confirmed interest in commercial retail floor plan. Requested loan eligibility check and callback over the weekend.",
          "Call completed: Discussed discounted payment milestones. Client agrees in principle, requested formal agreement copy to be shared via WhatsApp.",
          "Customer inquired about site visit availability on Sunday morning. Assigned telecaller to coordinate cab arrangement and confirm time slot."
        ];
        const randomTranscript = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
        logAudit('AUDIO_TRANSCRIBED', `Simulated audio transcription (${Math.round(cleanBase64.length / 1024)} KB audio)`, req.user, getClientIp(req));
        return res.json({
          text: randomTranscript,
          isSimulated: true,
          model: 'gemini-3.5-transcribe',
          note: 'GEMINI_API_KEY is not set in environment; returned realistic telecalling transcript.'
        });
      }

      const ai = new GoogleGenAI({
        apiKey: GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const audioPart = {
        inlineData: {
          mimeType: audioMime,
          data: cleanBase64
        }
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            { text: 'Transcribe this telecalling audio note accurately in English or original spoken language (e.g. Hindi/English mix). Provide the exact text spoken without commentary.' }
          ]
        }
      });

      const transcribedText = response.text || '';
      logAudit('AUDIO_TRANSCRIBED', `Transcribed audio note with model gemini-3.5-transcribe`, req.user, getClientIp(req));
      res.json({
        text: transcribedText,
        model: 'gemini-3.5-transcribe',
        isSimulated: false
      });
    } catch (err: any) {
      console.error('[Transcription Error]', err);
      // Fallback gracefully on API errors
      res.status(500).json({
        error: err.message || 'Failed to transcribe audio',
        code: 'TRANSCRIPTION_FAILED'
      });
    }
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DialPulse CRM] Server running on port ${PORT}`);
  });
}

startServer();
