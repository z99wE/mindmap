import { PoolClient } from 'pg';
/**
 * Database connection pool with automatic reconnection
 * and connection health monitoring.
 */
export declare class DatabaseClient {
    private pool;
    private redis;
    private healthCheckInterval?;
    constructor();
    /**
     * Execute parameterized query with automatic connection management
     */
    query(sql: string, params?: any[]): Promise<any>;
    /**
     * Execute transaction with automatic rollback on error
     */
    transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
    /**
     * Redis cache operations
     */
    cacheGet<T>(key: string): Promise<T | null>;
    cacheSet(key: string, value: any, ttlSeconds?: number): Promise<void>;
    cacheDelete(key: string): Promise<void>;
    /**
     * Health check
     */
    healthCheck(): Promise<{
        database: boolean;
        redis: boolean;
    }>;
    private setupEventHandlers;
    private startHealthChecks;
    /**
     * Graceful shutdown
     */
    close(): Promise<void>;
}
export declare const db: DatabaseClient;
//# sourceMappingURL=client.d.ts.map