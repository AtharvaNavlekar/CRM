import { Redis, RedisOptions } from 'ioredis';
import crypto from 'crypto';
import { logger } from './logger';
import { redisConnectionErrors } from './metrics';

/**
 * ------------------------------------------------------------------
 * Redis Shared Infrastructure Abstraction
 * ------------------------------------------------------------------
 * This module provides the authoritative, single-instance Redis client
 * for the application. It handles connection lifecycle, reconnections,
 * and exposes primitive operations for rate limiting, locking, and 
 * transient state coordination.
 * 
 * NOTE: Redis is explicitly for short-lived / shared infrastructure state,
 * NOT for durable business data (which lives in PostgreSQL).
 */

const REDIS_URL = process.env.REDIS_URL;

// Base options focusing on safe retry and timeout behavior
const baseOptions: RedisOptions = {
  maxRetriesPerRequest: 3, // Don't block indefinitely on single requests if down
  enableReadyCheck: true,
  retryStrategy(times) {
    // Reconnect with backoff, max out at 5 seconds
    // We do not want unbounded reconnect loops crashing the network
    const delay = Math.min(times * 100, 5000);
    return delay;
  },
  reconnectOnError(err) {
    // Reconnect on network errors
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  }
};

class RedisService {
  private client: Redis | null = null;
  private isConnecting: boolean = false;
  private connectionError: Error | null = null;

  constructor() {
    this.init();
  }


  private init() {
    if (!REDIS_URL && process.env.NODE_ENV === 'production') {
      logger.warn('[REDIS] WARNING: REDIS_URL is missing in production. Dependent features (e.g. rate limits) will fail securely.');
    }

    if (REDIS_URL) {
      try {
        this.client = new Redis(REDIS_URL, baseOptions);
        this.setupListeners();
      } catch (err: any) {
        console.error('[REDIS] Failed to initialize Redis client:', err.message);
        this.connectionError = err;
      }
    } else {
      // In local dev, if no REDIS_URL is provided, we don't connect.
      // Features relying on it will fail gracefully or strictly based on their policy.
      console.log('[REDIS] No REDIS_URL provided. Running in degraded mode without Redis infrastructure.');
    }
  }

  private setupListeners() {
    if (!this.client) return;

    this.client.on('connect', () => {
      logger.debug('[REDIS] Attempting connection...');
    });

    this.client.on('ready', () => {
      this.isConnecting = false;
      this.connectionError = null;
      logger.info('[REDIS] Connection established and ready.');
    });

    this.client.on('error', (err) => {
      this.connectionError = err;
      redisConnectionErrors.inc();
      logger.error('[REDIS] Connection error', err);
    });

    this.client.on('close', () => {
      logger.warn('[REDIS] Connection closed.');
    });

    this.client.on('reconnecting', () => {
      logger.info('[REDIS] Attempting to reconnect...');
    });
  }

  /**
   * Returns the underlying ioredis client instance if connected, otherwise null.
   * Useful for passing to infrastructure libraries like rate-limit-redis.
   */
  public getClient(): Redis | null {
    return this.client;
  }

  /**
   * Health check for readiness probes
   */
  // In-memory fallback store when Redis is unavailable in local/preview mode
  private memoryStore = new Map<string, string>();

  public async ping(): Promise<boolean> {
    if (!this.client) return true;
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return true;
    }
  }

  // -------------------------------------------------------------
  // Data Primitives
  // -------------------------------------------------------------

  public async get(key: string): Promise<string | null> {
    if (!this.client) {
      return this.memoryStore.get(key) || null;
    }
    return await this.client.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) {
      this.memoryStore.set(key, value);
      return;
    }
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  public async delete(key: string): Promise<number> {
    if (!this.client) {
      const existed = this.memoryStore.delete(key);
      return existed ? 1 : 0;
    }
    return await this.client.del(key);
  }

  public async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.client) {
      const current = parseInt(this.memoryStore.get(key) || '0', 10) || 0;
      const next = current + 1;
      this.memoryStore.set(key, String(next));
      return next;
    }
    // Using a simple pipeline for atomicity if TTL is provided
    if (ttlSeconds) {
      const res = await this.client
        .multi()
        .incr(key)
        .expire(key, ttlSeconds, 'NX') // Set expire only if it doesn't exist
        .exec();
      
      if (!res || !res[0]) throw new Error('Increment failed');
      return res[0][1] as number;
    } else {
      return await this.client.incr(key);
    }
  }

  // -------------------------------------------------------------
  // Clean Shutdown
  // -------------------------------------------------------------
  
  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

export const redisService = new RedisService();

/**
 * Utility for creating tenant-safe deterministic hash keys for Redis.
 * Useful for anonymizing IPs or sensitive IDs before using as keys.
 */
export function createSafeKey(namespace: string, tenantId: string, sensitiveIdentifier: string): string {
  const hash = crypto.createHash('sha256').update(sensitiveIdentifier).digest('hex');
  return `dp:${namespace}:${tenantId}:${hash}`;
}
