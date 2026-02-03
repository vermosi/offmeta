/**
 * Concurrent abuse prevention tests.
 * Tests for race conditions, cache stampedes, and parallel request abuse.
 * @module lib/security/concurrent-abuse.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  simulateConcurrentRequests,
  createMockRateLimiter,
  SECURITY_LIMITS,
} from './index';

// ============================================================================
// Parallel Rate Limit Bypass Prevention Tests
// ============================================================================

describe('Security: Parallel Rate Limit Bypass Prevention', () => {
  it('counts all concurrent requests against limit', async () => {
    const rateLimiter = createMockRateLimiter(10, 60000);
    const ip = '10.0.0.1';
    
    // Simulate 20 concurrent requests
    const results = await simulateConcurrentRequests(20, async () => {
      return rateLimiter.check(ip);
    });

    const allowed = results.filter((r) => r.allowed).length;
    const blocked = results.filter((r) => !r.allowed).length;

    expect(allowed).toBe(10); // Only limit allowed
    expect(blocked).toBe(10); // Rest blocked
  });

  it('handles burst of 50 simultaneous requests', async () => {
    const rateLimiter = createMockRateLimiter(30, 60000);
    const ip = '10.0.0.2';

    const results = await simulateConcurrentRequests(50, async () => {
      return rateLimiter.check(ip);
    });

    const allowed = results.filter((r) => r.allowed).length;
    expect(allowed).toBe(30);
  });

  it('maintains limit accuracy under concurrent load', async () => {
    const limit = 100;
    const rateLimiter = createMockRateLimiter(limit, 60000);
    const ip = '10.0.0.3';

    // Run 200 concurrent requests
    const results = await simulateConcurrentRequests(200, async () => {
      return rateLimiter.check(ip);
    });

    const allowed = results.filter((r) => r.allowed).length;
    
    // All allowed requests should be exactly at limit
    expect(allowed).toBe(limit);
  });
});

// ============================================================================
// Cache Stampede Prevention Tests
// ============================================================================

describe('Security: Cache Stampede Prevention', () => {
  it('prevents duplicate cache population requests', async () => {
    let populationCount = 0;
    const cache = new Map<string, { value?: string; pending?: Promise<string> }>();

    async function getWithDedup(key: string): Promise<string> {
      const cached = cache.get(key);
      
      if (cached?.value) {
        return cached.value;
      }

      if (cached?.pending) {
        return cached.pending;
      }

      // Simulate cache population
      const pending = new Promise<string>((resolve) => {
        setTimeout(() => {
          populationCount++;
          const value = `value-${key}`;
          cache.set(key, { value });
          resolve(value);
        }, 10);
      });

      cache.set(key, { pending });
      return pending;
    }

    // 100 concurrent requests for the same key
    const results = await simulateConcurrentRequests(100, () => getWithDedup('test-key'));

    // All should return the same value
    expect(results.every((r) => r === 'value-test-key')).toBe(true);
    
    // Cache should only be populated once
    expect(populationCount).toBe(1);
  });

  it('handles concurrent cache misses for different keys', async () => {
    let populationCount = 0;
    const cache = new Map<string, string>();

    async function getOrPopulate(key: string): Promise<string> {
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      populationCount++;
      const value = `value-${key}`;
      cache.set(key, value);
      return value;
    }

    // 10 requests for 10 different keys
    const keys = Array.from({ length: 10 }, (_, i) => `key-${i}`);
    const results = await Promise.all(keys.map((k) => getOrPopulate(k)));

    expect(results.length).toBe(10);
    expect(populationCount).toBe(10); // Each key populated once
  });
});

// ============================================================================
// Session Exhaustion Prevention Tests
// ============================================================================

describe('Security: Session Exhaustion Prevention', () => {
  it('limits maximum active sessions', () => {
    const MAX_SESSIONS = 1000;
    const sessions = new Map<string, { created: number }>();

    function createSession(): string | null {
      if (sessions.size >= MAX_SESSIONS) {
        return null; // Reject new sessions
      }

      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { created: Date.now() });
      return sessionId;
    }

    // Create sessions up to limit
    for (let i = 0; i < MAX_SESSIONS; i++) {
      expect(createSession()).not.toBeNull();
    }

    // Next session should be rejected
    expect(createSession()).toBeNull();
  });

  it('evicts oldest sessions when limit reached', () => {
    const MAX_SESSIONS = 100;
    const sessions = new Map<string, { created: number }>();

    function createSessionWithEviction(): string {
      if (sessions.size >= MAX_SESSIONS) {
        // Evict oldest session
        let oldest: string | null = null;
        let oldestTime = Infinity;

        for (const [id, data] of sessions) {
          if (data.created < oldestTime) {
            oldest = id;
            oldestTime = data.created;
          }
        }

        if (oldest) {
          sessions.delete(oldest);
        }
      }

      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, { created: Date.now() });
      return sessionId;
    }

    // Create more sessions than limit
    const created: string[] = [];
    for (let i = 0; i < 150; i++) {
      created.push(createSessionWithEviction());
    }

    // Should maintain limit
    expect(sessions.size).toBe(MAX_SESSIONS);

    // Oldest sessions should be evicted
    expect(sessions.has(created[0])).toBe(false);
    expect(sessions.has(created[49])).toBe(false);
    
    // Newest sessions should remain
    expect(sessions.has(created[149])).toBe(true);
  });

  it('limits session memory usage', () => {
    const MAX_SESSION_DATA_SIZE = 1024; // 1KB per session

    function validateSessionData(data: Record<string, unknown>): boolean {
      const size = JSON.stringify(data).length;
      return size <= MAX_SESSION_DATA_SIZE;
    }

    const smallData = { userId: '123', preferences: { theme: 'dark' } };
    const largeData = { userId: '123', blob: 'x'.repeat(2000) };

    expect(validateSessionData(smallData)).toBe(true);
    expect(validateSessionData(largeData)).toBe(false);
  });
});

// ============================================================================
// Request Queue Overflow Prevention Tests
// ============================================================================

describe('Security: Request Queue Overflow Prevention', () => {
  it('rejects requests when queue is full', async () => {
    const MAX_QUEUE_SIZE = 50;
    const queue: Promise<void>[] = [];
    
    function enqueue(task: () => Promise<void>): boolean {
      if (queue.length >= MAX_QUEUE_SIZE) {
        return false; // Queue full
      }

      const promise = task().finally(() => {
        const index = queue.indexOf(promise);
        if (index !== -1) {
          queue.splice(index, 1);
        }
      });

      queue.push(promise);
      return true;
    }

    // Fill the queue with slow tasks
    for (let i = 0; i < MAX_QUEUE_SIZE; i++) {
      const result = enqueue(async () => {
        await new Promise((r) => setTimeout(r, 1000));
      });
      expect(result).toBe(true);
    }

    // Next enqueue should fail
    expect(
      enqueue(async () => {
        await new Promise((r) => setTimeout(r, 100));
      }),
    ).toBe(false);
  });

  it('processes queue fairly', async () => {
    const processed: number[] = [];
    const queue: (() => Promise<void>)[] = [];
    let isProcessing = false;

    async function processQueue(): Promise<void> {
      if (isProcessing) return;
      isProcessing = true;

      while (queue.length > 0) {
        const task = queue.shift();
        if (task) await task();
      }

      isProcessing = false;
    }

    function enqueue(id: number): void {
      queue.push(async () => {
        processed.push(id);
      });
      processQueue();
    }

    // Enqueue tasks
    for (let i = 0; i < 10; i++) {
      enqueue(i);
    }

    // Wait for processing
    await new Promise((r) => setTimeout(r, 100));

    // Should process in order (FIFO)
    expect(processed).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

// ============================================================================
// Race Condition Prevention Tests
// ============================================================================

describe('Security: Race Condition Prevention', () => {
  it('handles concurrent counter increments correctly', async () => {
    let counter = 0;
    const lock = { held: false };

    async function incrementWithLock(): Promise<void> {
      // Wait for lock
      while (lock.held) {
        await new Promise((r) => setTimeout(r, 1));
      }
      
      lock.held = true;
      try {
        const current = counter;
        await new Promise((r) => setTimeout(r, 1)); // Simulate async work
        counter = current + 1;
      } finally {
        lock.held = false;
      }
    }

    // Run 10 concurrent increments
    await simulateConcurrentRequests(10, incrementWithLock);

    // Counter should be exactly 10
    expect(counter).toBe(10);
  });

  it('prevents double-submission attacks', async () => {
    const processedRequests = new Set<string>();

    async function processRequest(requestId: string): Promise<boolean> {
      if (processedRequests.has(requestId)) {
        return false; // Already processed
      }

      processedRequests.add(requestId);
      await new Promise((r) => setTimeout(r, 10)); // Simulate processing
      return true;
    }

    const requestId = 'unique-request-123';

    // Submit same request 10 times concurrently
    const results = await simulateConcurrentRequests(10, () =>
      processRequest(requestId),
    );

    const successCount = results.filter(Boolean).length;
    
    // Only one should succeed
    expect(successCount).toBe(1);
  });

  it('maintains data consistency under concurrent updates', async () => {
    interface Account {
      balance: number;
    }

    const accounts = new Map<string, Account>([
      ['A', { balance: 100 }],
      ['B', { balance: 100 }],
    ]);

    const locks = new Map<string, boolean>();

    async function transfer(
      from: string,
      to: string,
      amount: number,
    ): Promise<boolean> {
      // Acquire locks in consistent order to prevent deadlock
      const [first, second] = from < to ? [from, to] : [to, from];

      while (locks.get(first) || locks.get(second)) {
        await new Promise((r) => setTimeout(r, 1));
      }

      locks.set(first, true);
      locks.set(second, true);

      try {
        const fromAccount = accounts.get(from);
        const toAccount = accounts.get(to);

        if (!fromAccount || !toAccount) return false;
        if (fromAccount.balance < amount) return false;

        fromAccount.balance -= amount;
        toAccount.balance += amount;
        return true;
      } finally {
        locks.set(first, false);
        locks.set(second, false);
      }
    }

    // Concurrent transfers
    await simulateConcurrentRequests(10, () => transfer('A', 'B', 10));

    // Total balance should remain constant
    const totalBalance = (accounts.get('A')?.balance || 0) + (accounts.get('B')?.balance || 0);
    expect(totalBalance).toBe(200);
  });
});
