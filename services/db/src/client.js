"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = exports.DatabaseClient = void 0;
const pg_1 = require("pg");
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * Database connection pool with automatic reconnection
 * and connection health monitoring.
 */
class DatabaseClient {
    constructor() {
        // PostgreSQL connection pool
        this.pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
            max: 20, // Max connections
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        // Redis connection
        this.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
        });
        this.setupEventHandlers();
        this.startHealthChecks();
    }
    /**
     * Execute parameterized query with automatic connection management
     */
    async query(sql, params = []) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(sql, params);
            return result;
        }
        catch (error) {
            console.error('Database query failed', {
                sql: sql.substring(0, 100),
                error
            });
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Execute transaction with automatic rollback on error
     */
    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Transaction failed, rolled back', { error });
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Redis cache operations
     */
    async cacheGet(key) {
        const cached = await this.redis.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    async cacheSet(key, value, ttlSeconds = 3600) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    }
    async cacheDelete(key) {
        await this.redis.del(key);
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            await this.pool.query('SELECT 1');
            await this.redis.ping();
            return { database: true, redis: true };
        }
        catch (error) {
            console.error('Health check failed', { error });
            return { database: false, redis: false };
        }
    }
    setupEventHandlers() {
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
    startHealthChecks() {
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
    async close() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        await this.pool.end();
        await this.redis.quit();
        console.log('Database connections closed');
    }
}
exports.DatabaseClient = DatabaseClient;
// Singleton instance
exports.db = new DatabaseClient();
//# sourceMappingURL=client.js.map