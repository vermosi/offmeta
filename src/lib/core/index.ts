/**
 * Core utilities and infrastructure.
 * @module lib/core
 */

export { cn } from './utils';
export { logger } from './logger';
export { env, validateEnv, type AppEnv } from './env';
export { monitoring, type MonitoringContext } from './monitoring';
export { APP_VERSION } from './app-version';
