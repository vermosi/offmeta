# Search Quality Repair Workflow

The `/admin/analytics` page now acts as a repair queue, not just a reporting dashboard.

## What the queue surfaces

The page ranks queries that most need attention using the `query_intelligence_agg` table and related search signals:

- lowest quality score queries
- highest no-result queries
- most-refined queries
- low-confidence AI fallback queries
- top `queries to fix` candidates

## How to use it

1. Open `/admin/analytics`.
2. Start from `queries to fix` or one of the ranked review sections.
3. Open a query drawer to inspect:
   - quality metrics
   - recent feedback
   - existing translation rules
   - recent query outcomes
4. Copy the golden test fixture for the query.
5. Create or edit a translation rule through the admin-safe repair endpoint.

## Backend pattern

The page does not mutate translation rules directly from the browser. It calls the admin-only edge function:

- `supabase/functions/admin-search-quality-repair`

That function:

- validates the caller is an admin
- reads repair candidates and query detail data
- inserts or updates `translation_rules` using the service role

## Operational intent

This workflow is meant to shorten the loop from:

`bad search signal -> inspect evidence -> draft rule -> save rule -> verify outcome`

The goal is to treat analytics as a queue of fixable search failures, not just a historical report.
