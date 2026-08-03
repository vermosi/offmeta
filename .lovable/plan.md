# Backfilling all card pricing data efficiently

## What we know right now

- `price_snapshots` holds 241 rows covering only 7 distinct cards. `cards` has 32,420 rows. `card_printings` is empty.
- The MTGJSON full-history file (`AllPrices.json.gz`) is 150 MB compressed and roughly 2 GB decompressed. The edge runtime hit `Memory limit exceeded`, then `CPU Time exceeded` on it even after switching to streaming. It cannot run there, at any batch size, because the cost is in decompressing the whole archive on every invocation.
- The daily file (`AllPricesToday.json.gz`) is only 5.4 MB compressed and covers every card with all providers and variants. That is comfortably inside edge limits.
- The sandbox already streamed the full archive successfully and wrote real Birds of Paradise history to the database.
- A `daily-price-snapshot` cron job already runs at 06:00 UTC.

## Recommended approach: one-time bulk backfill here, daily top-ups on the edge

Split the problem by cost. History is a single expensive job that belongs in the sandbox; the daily delta is cheap and belongs in an edge function.

### Step 1 — One-time full-history backfill from the sandbox

Run a single pass over the full MTGJSON archive locally, matched against the 32,420 names already in `cards`, and load the result straight into `price_snapshots` with a bulk CSV copy.

- Stream and decompress `AllPrices.json.gz` once, extracting price objects for every card name we track rather than one card at a time.
- For each card, take the last 90 days of `paper` prices (matching the existing 90-day prune window) across low, average, market and foil series.
- Write to CSV and bulk-load in one operation, deduplicated by card name, source and date.
- Expected shape: roughly 30k cards times up to 90 days, so on the order of a few million rows. The plan chunks the load and reports progress.

### Step 2 — Replace the edge function's mode with the daily file

Rework `mtgjson-price-history-sync` so its scheduled path reads `AllPricesToday.json.gz` instead of the full archive. That file is small enough to parse in one invocation, so the function becomes a simple "append today's prices for every card" job with no recursion, no scanning and no batching.

The existing unique index on card name, source and date makes repeated runs idempotent.

### Step 3 — Wire it to the existing schedule

Point a cron job at the reworked function once daily, after MTGJSON publishes (the file's last-modified timestamp is around 06:00 UTC, so 07:00 UTC is safe). Keep the existing `prune-price-snapshots-weekly` job as the retention control.

### Step 4 — Decide on `card_printings`

The scan mode in the current function depends on `card_printings`, which is empty. With the approach above, scan mode is no longer needed for pricing, so the table is only worth populating if printings data is wanted for its own sake. Running `card-printings-sync` is a separate, optional job.

## Alternatives considered

- Keeping the full archive in an edge function with smaller batches: does not work. The decompression cost is per-invocation and independent of batch size.
- Fetching per-card history from Scryfall: Scryfall exposes only current prices, not history.

## Technical notes

- Files touched: `supabase/functions/mtgjson-price-history-sync/index.ts` (switch to the daily file, drop the scan/recursion path), plus a sandbox backfill script under `scripts/`.
- Load path for the bulk step is `COPY ... FROM STDIN WITH CSV`, not row-by-row inserts.
- Uniqueness relies on the existing `idx_price_snapshots_card_source_recorded` index; all writes use `source = 'mtgjson'` so the older `scryfall` rows are untouched.
- No schema changes are required — the variant columns and the index are already in place.

## Open question

The full 90-day backfill produces a few million rows. If you would rather keep the table small, the backfill can be limited to a shorter window (for example 30 days) or to cards above a price threshold.
