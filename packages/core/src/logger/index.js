"use strict";
/**
 * Centralized Logging with Pino
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = exports.logger = void 0;
const pino_1 = __importDefault(require("pino"));
exports.logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || 'info',
    base: {
        service: 'thought-gps',
        version: process.env.npm_package_version || '0.0.0',
        environment: process.env.NODE_ENV || 'development',
    },
    transport: process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
                singleLine: false,
            },
        },
});
// Export typed logger methods
exports.log = {
    info: (context, message) => exports.logger.info(context, message),
    error: (context, message) => exports.logger.error(context, message),
    warn: (context, message) => exports.logger.warn(context, message),
    debug: (context, message) => exports.logger.debug(context, message),
};
//# sourceMappingURL=index.js.map