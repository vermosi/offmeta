/**
 * Performance benchmarks for semantic-search edge function.
 * Measures response times across different query types and complexities.
 * @module semantic-search/benchmark.test
 */

import { loadSync } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Try to load env vars, but don't fail if some are missing
try {
  loadSync({ export: true, allowEmptyValues: true });
} catch {
  // .env.example may have vars not set in actual .env - that's OK
}

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "https://nxmzyykkzwomkcentctt.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bXp5eWtrendvbWtjZW50Y3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzgwOTYsImV4cCI6MjA4MDgxNDA5Nn0.sJbaqJuvKqIMYV0D2Q4iWgTRlzVGih7OXRRkGmDsGPY";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/semantic-search`;

interface BenchmarkResult {
  queryType: string;
  query: string;
  responseTimeMs: number;
  confidence: number;
  success: boolean;
  cached: boolean;
}

interface BenchmarkStats {
  queryType: string;
  count: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p50Ms: number;
  p95Ms: number;
  successRate: number;
  cacheHitRate: number;
}

async function makeRequest(
  query: string,
  options: { useCache?: boolean; cacheSalt?: string } = {},
): Promise<BenchmarkResult & { scryfallQuery: string }> {
  const start = performance.now();
  
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      query,
      useCache: options.useCache ?? false,
      cacheSalt: options.cacheSalt,
    }),
  });

  const elapsed = performance.now() - start;
  const data = await response.json();

  return {
    queryType: "",
    query,
    responseTimeMs: elapsed,
    confidence: data.confidence ?? 0,
    success: response.ok && !!data.scryfallQuery,
    cached: data.cached ?? false,
    scryfallQuery: data.scryfallQuery ?? "",
  };
}

function calculateStats(results: BenchmarkResult[]): BenchmarkStats {
  if (results.length === 0) {
    return {
      queryType: "unknown",
      count: 0,
      avgMs: 0,
      minMs: 0,
      maxMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      successRate: 0,
      cacheHitRate: 0,
    };
  }

  const times = results.map((r) => r.responseTimeMs).sort((a, b) => a - b);
  const successCount = results.filter((r) => r.success).length;
  const cacheHitCount = results.filter((r) => r.cached).length;

  return {
    queryType: results[0].queryType,
    count: results.length,
    avgMs: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    minMs: Math.round(times[0]),
    maxMs: Math.round(times[times.length - 1]),
    p50Ms: Math.round(times[Math.floor(times.length * 0.5)]),
    p95Ms: Math.round(times[Math.floor(times.length * 0.95)] ?? times[times.length - 1]),
    successRate: Math.round((successCount / results.length) * 100),
    cacheHitRate: Math.round((cacheHitCount / results.length) * 100),
  };
}

// Query categories for benchmarking
const BENCHMARK_QUERIES = {
  simple: [
    "red creatures",
    "blue instants",
    "green ramp",
    "black removal",
    "white enchantments",
  ],
  medium: [
    "creatures with flying under $5",
    "legendary creatures from modern",
    "artifacts that tap for mana",
    "instants that draw cards",
    "enchantments with flash",
  ],
  complex: [
    "mono red aggressive creatures under $2 from pioneer",
    "blue green legendary creatures with card draw abilities",
    "artifacts that create treasure tokens legal in commander",
    "creatures with power greater than toughness that cost 3 or less",
    "multicolor enchantments from the last 3 years",
  ],
  deterministic: [
    "t:creature c=r",
    "t:instant c=u cmc<=3",
    "t:legendary t:creature",
    'o:"draw a card"',
    "r:mythic",
  ],
  slang: [
    "ETB creatures",
    "mana rocks",
    "board wipes",
    "tutors",
    "stax pieces",
  ],
};

Deno.test({
  name: "Benchmark: Simple queries (baseline)",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const results: BenchmarkResult[] = [];

    for (const query of BENCHMARK_QUERIES.simple) {
      const result = await makeRequest(query, { cacheSalt: `bench-${Date.now()}` });
      results.push({ ...result, queryType: "simple" });
      // Small delay between requests
      await new Promise((r) => setTimeout(r, 100));
    }

    const stats = calculateStats(results);
    console.log("\n📊 Simple Query Stats:");
    console.log(`   Count: ${stats.count}`);
    console.log(`   Avg: ${stats.avgMs}ms | Min: ${stats.minMs}ms | Max: ${stats.maxMs}ms`);
    console.log(`   P50: ${stats.p50Ms}ms | P95: ${stats.p95Ms}ms`);
    console.log(`   Success Rate: ${stats.successRate}%`);

    assertEquals(stats.successRate, 100, "All simple queries should succeed");
    assert(stats.avgMs < 5000, `Average response time should be under 5s (was ${stats.avgMs}ms)`);
  },
});

Deno.test({
  name: "Benchmark: Medium complexity queries",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const results: BenchmarkResult[] = [];

    for (const query of BENCHMARK_QUERIES.medium) {
      const result = await makeRequest(query, { cacheSalt: `bench-${Date.now()}` });
      results.push({ ...result, queryType: "medium" });
      await new Promise((r) => setTimeout(r, 100));
    }

    const stats = calculateStats(results);
    console.log("\n📊 Medium Complexity Query Stats:");
    console.log(`   Count: ${stats.count}`);
    console.log(`   Avg: ${stats.avgMs}ms | Min: ${stats.minMs}ms | Max: ${stats.maxMs}ms`);
    console.log(`   P50: ${stats.p50Ms}ms | P95: ${stats.p95Ms}ms`);
    console.log(`   Success Rate: ${stats.successRate}%`);

    assertEquals(stats.successRate, 100, "All medium queries should succeed");
    assert(stats.avgMs < 6000, `Average response time should be under 6s (was ${stats.avgMs}ms)`);
  },
});

Deno.test({
  name: "Benchmark: Complex queries",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const results: BenchmarkResult[] = [];

    for (const query of BENCHMARK_QUERIES.complex) {
      const result = await makeRequest(query, { cacheSalt: `bench-${Date.now()}` });
      results.push({ ...result, queryType: "complex" });
      await new Promise((r) => setTimeout(r, 100));
    }

    const stats = calculateStats(results);
    console.log("\n📊 Complex Query Stats:");
    console.log(`   Count: ${stats.count}`);
    console.log(`   Avg: ${stats.avgMs}ms | Min: ${stats.minMs}ms | Max: ${stats.maxMs}ms`);
    console.log(`   P50: ${stats.p50Ms}ms | P95: ${stats.p95Ms}ms`);
    console.log(`   Success Rate: ${stats.successRate}%`);

    assert(stats.successRate >= 80, "At least 80% of complex queries should succeed");
    assert(stats.avgMs < 8000, `Average response time should be under 8s (was ${stats.avgMs}ms)`);
  },
});

Deno.test({
  name: "Benchmark: Deterministic queries (fastest path)",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const results: BenchmarkResult[] = [];

    for (const query of BENCHMARK_QUERIES.deterministic) {
      const result = await makeRequest(query, { cacheSalt: `bench-${Date.now()}` });
      results.push({ ...result, queryType: "deterministic" });
      await new Promise((r) => setTimeout(r, 100));
    }

    const stats = calculateStats(results);
    console.log("\n📊 Deterministic Query Stats (should be fastest):");
    console.log(`   Count: ${stats.count}`);
    console.log(`   Avg: ${stats.avgMs}ms | Min: ${stats.minMs}ms | Max: ${stats.maxMs}ms`);
    console.log(`   P50: ${stats.p50Ms}ms | P95: ${stats.p95Ms}ms`);
    console.log(`   Success Rate: ${stats.successRate}%`);

    assertEquals(stats.successRate, 100, "All deterministic queries should succeed");
    // Deterministic queries should be faster since they skip AI
    assert(stats.avgMs < 2000, `Deterministic queries should average under 2s (was ${stats.avgMs}ms)`);
  },
});

Deno.test({
  name: "Benchmark: Slang/jargon queries",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const results: BenchmarkResult[] = [];

    for (const query of BENCHMARK_QUERIES.slang) {
      const result = await makeRequest(query, { cacheSalt: `bench-${Date.now()}` });
      results.push({ ...result, queryType: "slang" });
      await new Promise((r) => setTimeout(r, 100));
    }

    const stats = calculateStats(results);
    console.log("\n📊 Slang/Jargon Query Stats:");
    console.log(`   Count: ${stats.count}`);
    console.log(`   Avg: ${stats.avgMs}ms | Min: ${stats.minMs}ms | Max: ${stats.maxMs}ms`);
    console.log(`   P50: ${stats.p50Ms}ms | P95: ${stats.p95Ms}ms`);
    console.log(`   Success Rate: ${stats.successRate}%`);

    assert(stats.successRate >= 80, "At least 80% of slang queries should succeed");
  },
});

Deno.test({
  name: "Benchmark: Cache performance",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const testQuery = "creatures with flying";
    const results: BenchmarkResult[] = [];

    // First request (cache miss expected)
    const firstResult = await makeRequest(testQuery, { useCache: true });
    results.push({ ...firstResult, queryType: "cache-miss" });
    console.log(`\n📊 Cache Performance Test:`);
    console.log(`   First request (miss): ${Math.round(firstResult.responseTimeMs)}ms`);

    // Subsequent requests (cache hit expected)
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 50));
      const result = await makeRequest(testQuery, { useCache: true });
      results.push({ ...result, queryType: "cache-hit" });
    }

    const cachedResults = results.slice(1);
    const cachedStats = calculateStats(cachedResults);
    
    console.log(`   Cached requests avg: ${cachedStats.avgMs}ms`);
    console.log(`   Cache hit rate: ${cachedStats.cacheHitRate}%`);
    console.log(`   Speedup: ${Math.round(firstResult.responseTimeMs / cachedStats.avgMs)}x`);

    // Cache should provide significant speedup
    if (cachedStats.cacheHitRate > 0) {
      assert(
        cachedStats.avgMs < firstResult.responseTimeMs * 0.5,
        "Cached requests should be at least 2x faster",
      );
    }
  },
});

Deno.test({
  name: "Benchmark: Concurrent request handling",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const queries = [
      "red creatures",
      "blue spells",
      "green ramp",
      "white tokens",
      "black zombies",
    ];

    const start = performance.now();
    
    // Fire all requests concurrently
    const promises = queries.map((q) =>
      makeRequest(q, { cacheSalt: `concurrent-${Date.now()}-${Math.random()}` })
    );
    
    const results = await Promise.all(promises);
    const totalTime = performance.now() - start;
    
    const individualTimes = results.map((r) => r.responseTimeMs);
    const avgIndividual = individualTimes.reduce((a, b) => a + b, 0) / individualTimes.length;
    const successCount = results.filter((r) => r.success).length;

    console.log("\n📊 Concurrent Request Stats:");
    console.log(`   Total wall clock time: ${Math.round(totalTime)}ms`);
    console.log(`   Avg individual response: ${Math.round(avgIndividual)}ms`);
    console.log(`   Concurrency benefit: ${Math.round((avgIndividual * queries.length) / totalTime)}x`);
    console.log(`   Success rate: ${Math.round((successCount / queries.length) * 100)}%`);

    assertEquals(successCount, queries.length, "All concurrent requests should succeed");
    // Concurrent requests should complete faster than sequential
    assert(
      totalTime < avgIndividual * queries.length * 0.7,
      "Concurrent handling should be faster than sequential",
    );
  },
});

Deno.test({
  name: "Benchmark: Summary report",
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    // Run a quick sample across all categories
    const allResults: BenchmarkResult[] = [];
    const categories = Object.entries(BENCHMARK_QUERIES);

    for (const [category, queries] of categories) {
      // Sample 2 queries per category for the summary
      for (const query of queries.slice(0, 2)) {
        const result = await makeRequest(query, { cacheSalt: `summary-${Date.now()}` });
        allResults.push({ ...result, queryType: category });
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    // Group by category
    const byCategory = new Map<string, BenchmarkResult[]>();
    for (const result of allResults) {
      const existing = byCategory.get(result.queryType) ?? [];
      existing.push(result);
      byCategory.set(result.queryType, existing);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 PERFORMANCE BENCHMARK SUMMARY");
    console.log("=".repeat(60));
    console.log("\nCategory           | Avg (ms) | P95 (ms) | Success");
    console.log("-".repeat(60));

    for (const [category, results] of byCategory) {
      const stats = calculateStats(results);
      const categoryPadded = category.padEnd(18);
      const avgPadded = String(stats.avgMs).padStart(8);
      const p95Padded = String(stats.p95Ms).padStart(8);
      const successPadded = `${stats.successRate}%`.padStart(7);
      console.log(`${categoryPadded} | ${avgPadded} | ${p95Padded} | ${successPadded}`);
    }

    const overallStats = calculateStats(allResults);
    console.log("-".repeat(60));
    console.log(`${"OVERALL".padEnd(18)} | ${String(overallStats.avgMs).padStart(8)} | ${String(overallStats.p95Ms).padStart(8)} | ${`${overallStats.successRate}%`.padStart(7)}`);
    console.log("=".repeat(60));

    assert(overallStats.successRate >= 80, "Overall success rate should be at least 80%");
  },
});
