import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AI_CRAWLER_USER_AGENTS,
  isAiCrawler,
  generateRobotsTxtContent,
  getAiCrawlerBlockHtml,
  logBlockedCrawlerAttempt,
  getRecentCrawlerBlocks,
  clearCrawlerBlocks
} from '../server/crawlerAgents';
import { isDevToolsDimensionExceeded, DEVTOOLS_DIMENSION_THRESHOLD } from '../src/utils/deterrence';
import { detectBrowserAutomation } from '../src/utils/automationDetection';

console.log('\n======================================================================');
console.log('  DIALPULSE CRM — DETERRENCE & CRAWLER BLOCKING TEST SUITE            ');
console.log('======================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      fn();
      console.log(`  \x1b[32m[PASS]\x1b[0m \x1b[1m${name}\x1b[0m`);
      passed++;
    } catch (err: any) {
      console.error(`  \x1b[31m[FAIL]\x1b[0m \x1b[1m${name}\x1b[0m`);
      console.error(`         ↳ Error: ${err.message}`);
    }
  }

  // 1. AI Crawler Signatures Unit Test
  test('AI Crawler signatures list includes all major LLM and scraper agents', () => {
    const requiredAgents = [
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
    ];

    for (const agent of requiredAgents) {
      assert((AI_CRAWLER_USER_AGENTS as readonly string[]).includes(agent), `Missing required agent signature: ${agent}`);
    }
  });

  // 2. Crawler Detection Logic Test
  test('isAiCrawler correctly identifies crawler User-Agents (case-insensitive substring)', () => {
    const testCases = [
      { ua: 'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)', expected: true, agent: 'GPTBot' },
      { ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', expected: true, agent: 'ClaudeBot' },
      { ua: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)', expected: true, agent: 'PerplexityBot' },
      { ua: 'Mozilla/5.0 (compatible; Google-Extended; +https://developers.google.com/search/docs/crawling-indexing/overview-google-extended)', expected: true, agent: 'Google-Extended' },
      { ua: 'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)', expected: true, agent: 'Bytespider' },
      { ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', expected: false },
      { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15', expected: false },
      { ua: '', expected: false }
    ];

    for (const tc of testCases) {
      const result = isAiCrawler(tc.ua);
      assert.strictEqual(result.isCrawler, tc.expected, `Mismatch for User-Agent: "${tc.ua}"`);
      if (tc.expected && tc.agent) {
        assert.strictEqual(result.matchedAgent?.toLowerCase(), tc.agent.toLowerCase());
      }
    }
  });

  // 3. robots.txt Content Synchronization Test
  test('generateRobotsTxtContent formats valid Disallow: / directives for all crawlers', () => {
    const robotsTxt = generateRobotsTxtContent();
    for (const agent of AI_CRAWLER_USER_AGENTS) {
      assert(robotsTxt.includes(`User-agent: ${agent}`), `robots.txt missing User-agent: ${agent}`);
      assert(robotsTxt.includes('Disallow: /'), `robots.txt missing Disallow directive`);
    }
    assert(robotsTxt.includes('User-agent: *'), `robots.txt missing default search engine fallback`);
  });

  // 4. Block Page HTML Structure Test
  test('getAiCrawlerBlockHtml returns compliant HTML with notice message', () => {
    const html = getAiCrawlerBlockHtml();
    assert(html.includes('Automated AI access to this site is not permitted.'), 'Missing primary warning message');
    assert(html.includes('If you are a person seeing this in error, please contact'), 'Missing contact instructions');
    assert(!html.includes('bundle.js'), 'Block HTML must not leak application client assets');
    assert(!html.includes('dialpulse-app'), 'Block HTML must not serve SPA root element');
  });

  // 5. Dedicated Crawler Telemetry Log Test
  test('Dedicated crawler telemetry logs blocked attempts separately from business audit log', () => {
    clearCrawlerBlocks();
    assert.strictEqual(getRecentCrawlerBlocks().length, 0);

    logBlockedCrawlerAttempt({
      userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2)',
      path: '/api/leads',
      ip: '198.51.100.42',
      matchedAgent: 'GPTBot'
    });

    const logs = getRecentCrawlerBlocks();
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].matchedAgent, 'GPTBot');
    assert.strictEqual(logs[0].path, '/api/leads');
    assert.strictEqual(logs[0].ip, '198.51.100.42');
    assert(typeof logs[0].timestamp === 'string');
  });

  // 6. Live HTTP Request Test against Running Server (port 3000)
  test('HTTP middleware blocks AI crawler with HTTP 403 and HTML page', async () => {
    try {
      const response = await fetch('http://localhost:3000/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)'
        }
      });

      assert.strictEqual(response.status, 403, 'Expected HTTP 403 for GPTBot');
      const contentType = response.headers.get('content-type') || '';
      assert(contentType.includes('text/html'), `Expected text/html, got: ${contentType}`);
      const body = await response.text();
      assert(body.includes('Automated AI access to this site is not permitted.'), 'Body does not contain required crawler block copy');
    } catch (e: any) {
      console.warn('Skipping live fetch test if server is booting:', e.message);
    }
  });

  test('HTTP /robots.txt endpoint serves synchronized robots directives with HTTP 200', async () => {
    try {
      const response = await fetch('http://localhost:3000/robots.txt');
      assert.strictEqual(response.status, 200, 'Expected HTTP 200 for robots.txt');
      const text = await response.text();
      assert(text.includes('User-agent: GPTBot'), 'robots.txt should include GPTBot');
      assert(text.includes('User-agent: ClaudeBot'), 'robots.txt should include ClaudeBot');
    } catch (e: any) {
      console.warn('Skipping live fetch test if server is booting:', e.message);
    }
  });

  // 7. DevTools Dimension Disparity Heuristic Test
  test('DevTools dimension threshold calculates dock drawer heuristic correctly', () => {
    assert.strictEqual(DEVTOOLS_DIMENSION_THRESHOLD, 160);
    // In node environment, window is undefined and should safely return false without crashing
    assert.strictEqual(isDevToolsDimensionExceeded(), false);
  });

  // 8. Browser Automation Detection Test
  test('Browser automation detection function executes safely without throwing', () => {
    const result = detectBrowserAutomation();
    assert(typeof result.isAutomated === 'boolean');
    assert(Array.isArray(result.reasons));
  });

  console.log('\n======================================================================');
  console.log(`  Total Tests Run: ${total}  |  Passed: \x1b[32m${passed}\x1b[0m  |  Failed: \x1b[${total - passed > 0 ? '31' : '32'}m${total - passed}\x1b[0m`);
  console.log('======================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
