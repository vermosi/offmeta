/* eslint-disable no-console */
/**
 * Error monitoring and performance tracking utilities.
 * Ready for integration with Sentry, LogRocket, or similar services.
 * @module lib/core/monitoring
 */

export interface MonitoringContext {
  userId?: string;
  sessionId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

/**
 * Monitoring service for error tracking and performance metrics.
 * Replace console calls with actual SDK integration in production.
 */
export const monitoring = {
  /**
   * Capture and report an exception to the monitoring service.
   * @param error - The error to capture
   * @param context - Additional context about the error
   */
  captureException: (error: Error, context?: MonitoringContext) => {
    // Ready for Sentry integration:
    // Sentry.captureException(error, { extra: context?.extra, tags: context?.tags });
    console.error('[Monitoring] Exception:', error.message, context);
  },

  /**
   * Capture a message/event to the monitoring service.
   * @param message - The message to capture
   * @param level - Severity level
   * @param context - Additional context
   */
  captureMessage: (
    message: string,
    level: 'info' | 'warning' | 'error' = 'info',
    context?: MonitoringContext,
  ) => {
    // Ready for Sentry integration:
    // Sentry.captureMessage(message, level);
    const logFn =
      level === 'error'
        ? console.error
        : level === 'warning'
          ? console.warn
          : console.info;
    logFn(`[Monitoring] ${level.toUpperCase()}:`, message, context);
  },

  /**
   * Set the current user for error tracking context.
   * @param userId - The user identifier
   * @param email - Optional user email
   */
  setUser: (userId: string, email?: string) => {
    // Ready for Sentry integration:
    // Sentry.setUser({ id: userId, email });
    console.info('[Monitoring] User set:', userId, email);
  },

  /**
   * Clear user context (on logout).
   */
  clearUser: () => {
    // Ready for Sentry integration:
    // Sentry.setUser(null);
    console.info('[Monitoring] User cleared');
  },

  /**
   * Add a breadcrumb for debugging context.
   * @param message - Description of the action
   * @param category - Category of the breadcrumb
   * @param data - Additional data
   */
  addBreadcrumb: (
    message: string,
    category: string,
    data?: Record<string, unknown>,
  ) => {
    // Ready for Sentry integration:
    // Sentry.addBreadcrumb({ message, category, data });
    console.debug('[Monitoring] Breadcrumb:', category, message, data);
  },

  /**
   * Start a performance transaction.
   * @param name - Transaction name
   * @param operation - Operation type
   * @returns Transaction handle for finishing
   */
  startTransaction: (name: string, operation: string) => {
    const start = performance.now();
    // Ready for Sentry integration:
    // return Sentry.startTransaction({ name, op: operation });
    return {
      finish: () => {
        const duration = performance.now() - start;
        console.debug(
          `[Monitoring] Transaction "${name}" (${operation}): ${duration.toFixed(2)}ms`,
        );
      },
    };
  },
};
