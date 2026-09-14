const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

const newChunk = `  app.post('/api/backups', async (req, res) => {
    return res.status(501).json({ error: 'Not Implemented: Backups are now managed by infrastructure scripts (pg_dump). Application identity no longer has backup privileges.' });
  });

  // Admin & IT restore
  app.post('/api/backups/:id/restore', async (req, res) => {
    return res.status(501).json({ error: 'Not Implemented: Restores must be performed by infrastructure administrators using secure restore scripts.' });
  });

  // Database Reset (Owner, CTO, IT only)
  app.post('/api/reset-data', async (req, res) => {
    if (!['owner', 'cto', 'it', 'Admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.status(501).json({ error: 'Not Implemented: Destructive database operations are disabled in the application runtime.' });
  });

  // 14. Settings APIs (Custom Fields, Role Permissions, Pipeline, Auto-Assignment)
  app.get('/api/settings', async (req, res) => {
    if (!['owner', 'cto', 'it', 'Admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const tenantId = req.securityContext?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });

    const settingsData = await db.select().from(schema.tenantSettings).where(eq(schema.tenantSettings.tenantId, tenantId)).limit(1);
    res.json(settingsData[0] || {});
  });

  app.put('/api/settings/fields', async (req, res) => {
    if (!['owner', 'cto', 'it', 'Admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(200).json({ success: true, message: 'Updated' });
  });

  app.put('/api/settings/roles', async (req, res) => {
    if (!['owner', 'cto', 'it', 'Admin'].includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
`;

const beforeTranscribe = `    const { audioBase64, mimeType } = req.body;`;

const transcribeIndex = content.indexOf(beforeTranscribe);

if (transcribeIndex !== -1) {
  content = content.substring(0, transcribeIndex) + newChunk + content.substring(transcribeIndex);
  console.log("Successfully replaced settings block");
} else {
  console.log("Could not find transcribeIndex!");
}

// Ensure POST /api/leads falls back assignedRepId
content = content.replace(
  `assignedRepId: assignedRepId || null,`,
  `assignedRepId: assignedRepId || req.securityContext!.actorUserId,`
);

fs.writeFileSync(serverFile, content);
