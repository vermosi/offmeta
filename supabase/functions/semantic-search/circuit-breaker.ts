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
    console.log('Circuit breaker entering half-open state');
    return false;
  }
  return true;
}

export function recordCircuitFailure(): void {
  circuitBreaker.failures++;
  circuitBreaker.lastFailure = Date.now();

  if (circuitBreaker.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    if (!circuitBreaker.isOpen) {
      console.warn('Circuit breaker OPENED - too many AI gateway failures');
      circuitBreaker.isOpen = true;
    }
  }
}

export function recordCircuitSuccess(): void {
  if (circuitBreaker.isOpen || circuitBreaker.failures > 0) {
    console.log('Circuit breaker RESET');
    circuitBreaker.failures = 0;
    circuitBreaker.isOpen = false;
    circuitBreaker.halfOpenAttempts = 0;
  }
}
