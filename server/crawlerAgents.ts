/**
 * This reliably blocks self-identifying AI crawlers and default-configuration
 * automation frameworks, but cannot guarantee blocking a sophisticated agent
 * driving a real browser with a normal, non-automated fingerprint — do not let
 * this comment be removed or the limitation get lost as "already solved" in any
 * future summary of this feature.
 *
 * NOTE: This list requires periodic maintenance as new AI crawlers, LLM search
 * indexing bots, and scraping agents emerge across the ecosystem.
 */

import fs from 'fs';
import path from 'path';

/**
 * Known AI Crawler and LLM Agent User-Agent signatures.
 * Kept in this single source of truth so robots.txt and server middleware cannot drift out of sync.
 */
export const AI_CRAWLER_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'CCBot',
  'Google-Extended',
  'PerplexityBot',
  'Bytespider',
  'anthropic-ai',
  'ClaudeBot',
  'Claude-Web',
  'cohere-ai',
  'Omgilibot',
  'Diffbot',
  'FacebookBot',
  'Amazonbot'
] as const;

export type AiCrawlerAgent = typeof AI_CRAWLER_USER_AGENTS[number];

export interface CrawlerCheckResult {
  isCrawler: boolean;
  matchedAgent?: string;
}

export interface CrawlerBlockLogEntry {
  timestamp: string;
  userAgent: string;
  path: string;
  ip?: string;
  matchedAgent?: string;
}

const CRAWLER_LOG_FILE = path.join(process.cwd(), 'data', 'crawler-blocks.log');

/**
 * Checks whether the incoming User-Agent header matches any known AI crawler.
 */
export function isAiCrawler(userAgentHeader: string | undefined): CrawlerCheckResult {
  if (!userAgentHeader || typeof userAgentHeader !== 'string') {
    return { isCrawler: false };
  }

  const normalizedUa = userAgentHeader.toLowerCase();

  for (const agent of AI_CRAWLER_USER_AGENTS) {
    if (normalizedUa.includes(agent.toLowerCase())) {
      return {
        isCrawler: true,
        matchedAgent: agent
      };
    }
  }

  return { isCrawler: false };
}

/**
 * Logs a blocked crawler attempt to a dedicated infrastructure/security log file,
 * strictly separated from business CRM audit logs.
 */
export function logBlockedCrawlerAttempt(entry: {
  userAgent: string;
  path: string;
  ip?: string;
  matchedAgent?: string;
}): void {
  try {
    const logEntry: CrawlerBlockLogEntry = {
      timestamp: new Date().toISOString(),
      userAgent: entry.userAgent || 'UNKNOWN',
      path: entry.path || '/',
      ip: entry.ip || 'UNKNOWN',
      matchedAgent: entry.matchedAgent
    };

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const line = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(CRAWLER_LOG_FILE, line, 'utf-8');
  } catch (err) {
    console.error('[Crawler Telemetry Log Error]', err);
  }
}

/**
 * Returns recent crawler block telemetry entries.
 */
export function getRecentCrawlerBlocks(limit = 100): CrawlerBlockLogEntry[] {
  try {
    if (!fs.existsSync(CRAWLER_LOG_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(CRAWLER_LOG_FILE, 'utf-8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const parsed: CrawlerBlockLogEntry[] = [];
    for (let i = lines.length - 1; i >= 0 && parsed.length < limit; i--) {
      try {
        parsed.push(JSON.parse(lines[i]));
      } catch {
        // skip malformed line
      }
    }
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Clears the crawler telemetry log file (useful for test resets).
 */
export function clearCrawlerBlocks(): void {
  try {
    if (fs.existsSync(CRAWLER_LOG_FILE)) {
      fs.writeFileSync(CRAWLER_LOG_FILE, '', 'utf-8');
    }
  } catch (err) {
    console.error('[Crawler Telemetry Clear Error]', err);
  }
}

/**
 * Generates standard robots.txt content using the synchronized AI crawler list.
 */
export function generateRobotsTxtContent(): string {
  const lines: string[] = [
    '# robots.txt for DialPulse CRM',
    '# NOTE: This list of AI crawlers requires periodic maintenance as new automated agents emerge.',
    ''
  ];

  for (const agent of AI_CRAWLER_USER_AGENTS) {
    lines.push(`User-agent: ${agent}`);
    lines.push('Disallow: /');
    lines.push('');
  }

  lines.push('# General search engine indexing rules');
  lines.push('User-agent: *');
  lines.push('Disallow: /api/');
  lines.push('Allow: /');
  lines.push('');

  return lines.join('\n');
}

/**
 * Returns a standalone, simple HTML warning page for blocked AI crawlers.
 * Does not serve any SPA code, CRM data, or application assets.
 */
export function getAiCrawlerBlockHtml(supportContact = 'support@dialpulse.io'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>403 Forbidden - Automated Access Restricted</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0F172A;
      --card-bg: #1E293B;
      --text: #F8FAFC;
      --muted: #94A3B8;
      --border: #334155;
      --accent: #00695C;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #F8FAFC;
        --card-bg: #FFFFFF;
        --text: #0F172A;
        --muted: #64748B;
        --border: #E2E8F0;
        --accent: #00695C;
      }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1.5rem;
    }
    .container {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 2.5rem;
      max-width: 520px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    }
    .icon-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: rgba(0, 105, 92, 0.15);
      color: var(--accent);
      margin-bottom: 1.25rem;
      font-size: 24px;
      font-weight: 700;
    }
    h1 {
      font-size: 1.35rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
      letter-spacing: -0.01em;
    }
    p {
      font-size: 0.95rem;
      line-height: 1.6;
      color: var(--muted);
      margin-bottom: 1.5rem;
    }
    .contact-link {
      display: inline-block;
      font-size: 0.875rem;
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
    }
    .contact-link:hover {
      text-decoration: underline;
    }
    .badge {
      display: inline-block;
      margin-top: 1.75rem;
      padding: 0.35rem 0.75rem;
      font-size: 0.75rem;
      font-family: monospace;
      color: var(--muted);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon-badge">✕</div>
    <h1>Automated Access Restricted</h1>
    <p>Automated AI access to this site is not permitted. If you are a person seeing this in error, please contact <a class="contact-link" href="mailto:${supportContact}">${supportContact}</a>.</p>
    <div class="badge">HTTP 403 Forbidden · AI Agent Restriction Active</div>
  </div>
</body>
</html>`;
}
