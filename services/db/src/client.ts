import { Pool, PoolClient } from 'pg';
import Redis from 'ioredis';

/**
 * Database connection pool with automatic reconnection
 * and connection health monitoring.
 */
export class DatabaseClient {
  private pool: Pool;
  private redis: Redis;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    // PostgreSQL connection pool
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Max connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Redis connection
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });

    this.setupEventHandlers();
    this.startHealthChecks();
  }

  /**
   * Execute parameterized query with automatic connection management
   */
  async query(
    sql: string, 
    params: any[] = []
  ): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(sql, params);
      return result;
    } catch (error) {
      console.error('Database query failed', { 
        sql: sql.substring(0, 100), 
        error 
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute transaction with automatic rollback on error
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed, rolled back', { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Redis cache operations
   */
  async cacheGet<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheSet(
    key: string, 
    value: any, 
    ttlSeconds: number = 3600
  ): Promise<void> {
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  async cacheDelete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    database: boolean;
    redis: boolean;
  }> {
    try {
      await this.pool.query('SELECT 1');
      await this.redis.ping();
      
      return { database: true, redis: true };
    } catch (error) {
      console.error('Health check failed', { error });
      return { database: false, redis: false };
    }
  }

  private setupEventHandlers(): void {
    this.pool.on('error', (error) => {
      console.error('Database pool error', { error });
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error', { error });
    });

    this.redis.on('connect', () => {
      console.log('Redis connected');
    });
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.healthCheck();
      
      if (!health.database || !health.redis) {
        console.warn('Health check degraded', health);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Graceful shutdown
   */
  async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.pool.end();
    await this.redis.quit();
    
    console.log('Database connections closed');
  }
}

// Singleton instance
export const db = new DatabaseClient();
