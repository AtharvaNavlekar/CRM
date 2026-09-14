const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
const lines = fs.readFileSync(serverFile, 'utf8').split('\n');

// Find the start of /api/auth/refresh
let startIdx = lines.findIndex(l => l.includes("app.post('/api/auth/refresh'"));
let endIdx = lines.findIndex((l, i) => i > startIdx && l.includes("app.get('/api/auth/me'"));

const replacement = `
  app.post('/api/auth/refresh', async (req, res) => {
    try {
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
    } catch (error: any) {
      logger.error('Refresh error', { error: error.message || error });
      return res.status(500).json({ error: 'Internal server error during token refresh' });
    }
  });

`;

lines.splice(startIdx, endIdx - startIdx, replacement);

fs.writeFileSync(serverFile, lines.join('\n'));
console.log('Fixed syntax error');
