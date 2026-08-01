/**
 * Centralized Logging with Pino
 */
export declare const logger: import("pino").Logger<never>;
export declare const log: {
    info: (context: Record<string, unknown>, message: string) => void;
    error: (context: Record<string, unknown>, message: string) => void;
    warn: (context: Record<string, unknown>, message: string) => void;
    debug: (context: Record<string, unknown>, message: string) => void;
};
//# sourceMappingURL=index.d.ts.map