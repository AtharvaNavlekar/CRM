import { db } from '../../db/client';
import { aiUsage } from '../../db/schema';
import { auditService } from '../auditService';
import { GeminiProvider, AIProvider } from './aiProvider';
import { aiConfig } from './aiConfig';
import { SecurityContext } from '../../../src/types';
import { can } from '../../policy';
import { randomUUID } from 'crypto';
import { sql } from 'drizzle-orm';
import { logger } from '../../infrastructure/logger';
import { aiRequestCount, aiErrorCount, aiLatency } from '../../infrastructure/metrics';

class AIService {
  private provider: AIProvider;
  private isSimulated: boolean;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.isSimulated = !apiKey;
    this.provider = new GeminiProvider(apiKey);
  }

  /**
   * Transcribe audio with full security and quota checks.
   */
  async transcribeAudio(
    context: SecurityContext, 
    audioBase64: string, 
    mimeType: string
  ): Promise<string> {
    
    // 1. Authorization
    if (!(await can(context, 'ai:use'))) {
      await auditService.logNormal({
        eventType: 'AI_DENIED' as any,
        outcome: 'DENIED',
        securityContext: context,
        reason: 'Missing ai:use capability',
        metadata: { action: 'transcribe' }
      });
      throw new Error('Unauthorized to use AI services');
    }

    if (!context.tenantId) {
      throw new Error('Tenant context is required for AI usage');
    }

    // 2. Quota Check
    await this.checkQuota(context.tenantId);

    // 3. Execution
    let resultText = '';
    let tokens = 0;
    let cost = 0;

    try {
      if (this.isSimulated) {
        // Fallback for development without API key
        await new Promise(resolve => setTimeout(resolve, 1500));
        resultText = "This is a simulated transcription because no GEMINI_API_KEY is configured.";
        tokens = 15;
      } else {
        const startTime = Date.now();
        const result = await this.provider.transcribeAudio(audioBase64, mimeType, {
          model: aiConfig.models.transcription,
          timeoutMs: aiConfig.limits.timeoutMs,
          maxTokens: aiConfig.limits.maxOutputTokens
        });
        const duration = Date.now() - startTime;
        aiRequestCount.inc({ model: aiConfig.models.transcription, operation: 'transcribe' });
        aiLatency.observe({ model: aiConfig.models.transcription, operation: 'transcribe' }, duration);

        resultText = result.text;
        tokens = result.estimatedTokens;
        cost = result.estimatedCost;
      }

      // 4. Record Usage
      await db.insert(aiUsage).values({
        id: randomUUID(),
        tenantId: context.tenantId,
        userId: context.actorUserId,
        model: aiConfig.models.transcription,
        action: 'transcribe',
        tokens,
        cost,
        occurredAt: new Date().toISOString()
      });

      // 5. Audit Success (do not log PII or raw audio)
      await auditService.logNormal({
        eventType: 'AI_COMPLETED' as any,
        outcome: 'SUCCESS',
        securityContext: context,
        metadata: { action: 'transcribe', tokens, cost }
      });

      return resultText;

    } catch (err: any) {
      aiErrorCount.inc({ model: aiConfig.models.transcription, operation: 'transcribe' });
      logger.error('AI transcription failed', err, {
        tenantId: context.tenantId,
        errorDetail: err.message
      }, context);

      // 6. Audit Failure
      await auditService.logNormal({
        eventType: 'AI_FAILED' as any,
        outcome: 'FAILURE',
        securityContext: context,
        reason: err.message || 'Unknown provider error',
        metadata: { action: 'transcribe' }
      });
      throw new Error('AI transcription failed: ' + (err.message || 'Unknown error'));
    }
  }

  /**
   * Ensures the tenant has not exceeded their monthly cost limits.
   */
  private async checkQuota(tenantId: string) {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const res = await db
      .select({ totalCost: sql<number>`COALESCE(SUM(${aiUsage.cost}), 0)` })
      .from(aiUsage)
      .where(sql`${aiUsage.tenantId} = ${tenantId} AND ${aiUsage.occurredAt} >= ${currentMonthStart.toISOString()}`);

    const totalCost = res[0]?.totalCost || 0;

    if (totalCost >= aiConfig.limits.maxCostPerTenantPerMonth) {
      throw new Error('Tenant AI quota exceeded for the month.');
    }
  }
}

export const aiService = new AIService();
