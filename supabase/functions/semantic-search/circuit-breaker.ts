import { createLogger } from './logging.ts';

const logger = createLogger('circuit-breaker');

// ============= CIRCUIT BREAKER =============
const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  isOpen: false,
  halfOpenAttempts: 0,
};

const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_RESET_TIMEOUT = 60000; // 1 minute

export function isCircuitOpen(): boolean {
  if (!circuitBreaker.isOpen) return false;

  const now = Date.now();
  if (now - circuitBreaker.lastFailure > CIRCUIT_RESET_TIMEOUT) {
    // Reset to half-open
    logger.logInfo('circuit_breaker_half_open');
    return false;
  }
  return true;
}

export function recordCircuitFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();

  if (circuitBreaker.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    if (!circuitBreaker.isOpen) {
      logger.logWarn('circuit_breaker_opened', {
        reason: 'too_many_ai_gateway_failures',
      });
      circuitBreaker.isOpen = true;
    }
  }
}

export function recordCircuitSuccess(): void {
  if (circuitBreaker.isOpen || circuitBreaker.failures > 0) {
    logger.logInfo('circuit_breaker_reset');
    circuitBreaker.failures = 0;
    circuitBreaker.isOpen = false;
    circuitBreaker.halfOpenAttempts = 0;
  }
}
