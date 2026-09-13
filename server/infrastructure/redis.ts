import { Redis, RedisOptions } from 'ioredis';
import crypto from 'crypto';

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
      console.warn('[REDIS] WARNING: REDIS_URL is missing in production. Dependent features (e.g. rate limits) will fail securely.');
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
      this.isConnecting = true;
    });

    this.client.on('ready', () => {
      this.isConnecting = false;
      this.connectionError = null;
      console.log('[REDIS] Connection ready.');
    });

    this.client.on('error', (err) => {
      this.connectionError = err;
      // Intentionally not logging every error to avoid log spam on outage
      if (!this.isConnecting) {
        console.error('[REDIS] Connection error:', err.message);
      }
    });

    this.client.on('close', () => {
      console.log('[REDIS] Connection closed.');
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
  public async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------
  // Data Primitives
  // -------------------------------------------------------------

  public async get(key: string): Promise<string | null> {
    if (!this.client) throw new Error('Redis not connected');
    return await this.client.get(key);
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) throw new Error('Redis not connected');
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  public async delete(key: string): Promise<number> {
    if (!this.client) return 0;
    return await this.client.del(key);
  }

  public async increment(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.client) throw new Error('Redis not connected');
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
