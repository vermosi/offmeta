# Recommendation Logic V2

This document is the engineering contract for OffMeta recommendation behavior. It adopts `offmeta-recommendation-logic-v2.md` as the product direction and records the non-negotiable implementation guardrails.

## Retrieval

- Parse a versioned `RecommendationIntent` before generic semantic translation.
- Treat explicit price, legality, color, type, mana-value, and exclusion constraints as hard filters. Source-card color is a soft feature.
- Issue at most four initial plans: combined functional (`1.00`), strongest independent functional (`0.85`), oracle/mechanic (`0.70`), and structural (`0.40`). Always retain structural fallback.
- Fetch one Scryfall page per plan, retain provenance, deduplicate by oracle identity, and cap the fused pool at 500.
- Use weighted reciprocal-rank fusion: `normalize(sum(planWeight / (60 + sourceRank)))`.
- Permit one recovery request only when fewer than 20 candidates remain or top confidence is below `0.50`. Five Scryfall requests is the absolute per-recommendation maximum.
- A malformed constraint-only translation, such as `usd<5`, is not a successful recommendation interpretation.

## Ranking

General search:

```text
0.55 semanticCoverage + 0.20 structuralCoverage
+ 0.15 logPopularity + 0.10 provenancePrior
```

Similarity:

```text
0.50 functionalProvenance + 0.20 oracleMechanicCoverage
+ 0.10 typeJaccard + 0.05 colorJaccard
+ 0.05 exp(-abs(manaValueDelta) / 2) + 0.10 logPopularity
```

Budget ranking is `0.80 * similarity + 0.20 * affordability`, where affordability is `clamp(1 - candidatePrice / ceiling, 0, 1)`. Explicit ceilings are exact. Automatic ceilings are `max(0.50, min(sourcePrice - 1, sourcePrice * 0.70))`; missing prices and source prices below `$2` disable automatic budget recommendations.

Oracle and tag evidence must be independently verifiable. Missing popularity is zero. Ownership and candidate-invariant behavioral constants do not affect V2 base relevance. Ties resolve by semantic coverage, structural coverage, provenance, then card name.

## Confidence

```text
0.35 planAgreement + 0.30 evidenceStrength
+ 0.20 scoreSeparation + 0.15 intentConfidence
```

`scoreSeparation` is the top-two score gap normalized by `0.15`. Confidence is high at `>=0.75`, medium at `>=0.50`, and low below `0.50`. AI may interpret intent or propose plans, but final ordering remains deterministic and inspectable.

## Evaluation

- Keep a frozen, human-reviewed anchor set independent from ranker tuning.
- Generate most constraint, stability, and retrieval cases from authoritative card data and held-out evidence.
- Measure recall@20, top-1, MRR, nDCG@5, constraint violations, calibration, determinism, and latency.
- Require zero explicit constraint violations, no category nDCG@5 regression over `0.05`, and at least `0.02` overall nDCG@5 improvement.
- Candidate and plan permutations must not alter deterministic output.

## Telemetry

Every rendered result set has unique request and result-set IDs. Events identify original/executed query, ranker, candidate, surface, one-based visible position, score, impression, and click latency. Visibility is measured with card-level intersection observation. Full top-result breakdowns are retained for clicks, rejections, anomalies, and canaries; ordinary successful sets are sampled at 10%.

Query intelligence is rebuilt only from attributable request-level outcomes. Historical events without a reliable query and request/result-set ID are excluded. Behavioral quality controls routing and diagnostics, never base candidate rank.

## Rollout

Promotion is automatic but gated: offline evaluation, then at least 500 shadow requests over 48 healthy hours, followed by 5%, 25%, 50%, and 100% canaries. Every canary stage needs 500 attributable searches and 48 hours. Useful-click and immediate-refinement non-inferiority probability must be at least 95% with a two-point margin. Constraint, negative-feedback, error, and latency guardrails can block or roll back promotion. Shadow validates correctness and latency only; unseen rankings cannot provide preference evidence.

Autonomous challengers may tune deterministic weights only after telemetry is trustworthy. They cannot relax hard constraints, retrieval budgets, evaluation independence, staged exposure, or rollback gates.
