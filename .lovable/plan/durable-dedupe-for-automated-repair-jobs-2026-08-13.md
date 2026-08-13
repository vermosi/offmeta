# Durable dedupe for automated repair jobs

Repeated failures should only trigger one repair action per cooldown window — even if the backend functions are redeployed, cold-started, or run on a different instance.

## What's happening today

The automated repair loop makes "have I already handled this?" decisions in three different ways, and only some of them survive a restart:

- **Operations watchdog** — remembers dispatches durably (stored in the database), so this one already behaves correctly across restarts. It does, however, reuse the job-locking table for two different purposes, which makes the cooldown easy to clear by accident.
- **Error auto-fix** — remembers which repair pipelines it already kicked off **only in memory, and only for the current run**. Every run starts with a blank slate, so ten sitemap failures across ten runs fire ten sitemap regenerations. This is the real gap.
- **Leftover lock rows** are never cleaned up, so the table grows slowly forever.

## What will change

### 1. A dedicated dedupe store

A new table records each dedupe decision with its own expiry:

- the decision key (for example `invoke:submit-sitemap`)
- what was decided and why
- when it expires
- how many times the same key was suppressed afterwards

Because the decision and its expiry live in the database, a redeploy or cold start no longer resets it.

### 2. A shared "claim once" helper

One helper used by every automated job: ask for a key, and get back either "you own this window, go ahead" or "already handled, here's the earlier decision and when it expires". Suppressed hits bump a counter so we can see how much repeat work is being absorbed.

### 3. Wire it into the repair jobs

- **Error auto-fix**: before invoking a repair pipeline, claim a durable key with a cooldown (30 minutes by default, matching the shortest backoff already used for error retries). The existing in-run memory cache stays as a cheap first layer in front of it.
- **Operations watchdog**: switch its 3-hour dispatch cooldown from the job-lock table onto the new store, so locking and cooldown stop sharing one table. Behaviour is unchanged.
- Each response reports how many actions were suppressed by dedupe, so it shows up in the run history.

### 4. Housekeeping

A cleanup routine removes expired dedupe rows and stale lock rows, added to the existing scheduled maintenance so neither table grows unbounded.

## Technical detail

**Migration**

- `public.job_dedupe` — `dedupe_key text primary key`, `decision jsonb not null default '{}'`, `claimed_at timestamptz not null default now()`, `expires_at timestamptz not null`, `hit_count integer not null default 0`.
- Grants: `GRANT ALL ON public.job_dedupe TO service_role;` only (no anon/authenticated grants — internal jobs reach it through security-definer RPCs with the service role). RLS enabled with no permissive policies, matching `job_locks` and `ops_watchdog_runs`.
- `public.claim_dedupe_key(p_key text, p_ttl_seconds int, p_decision jsonb)` — security definer, `search_path = public`. `INSERT ... ON CONFLICT (dedupe_key) DO UPDATE ... WHERE job_dedupe.expires_at < now()` to re-claim expired keys atomically; on a live key, bumps `hit_count` and returns `{claimed: false, decision, expires_at}`. Returns `{claimed: true}` when the caller owns the window.
- `public.record_dedupe_decision(p_key text, p_decision jsonb)` — updates the stored decision after the action completes, so a suppressed caller gets the real outcome rather than a placeholder.
- `public.prune_dedupe_and_locks()` — deletes `job_dedupe` rows past `expires_at` and `job_locks` rows past `expires_at`.
- Index on `expires_at` for the prune.
- Schedule `prune_dedupe_and_locks` on the existing daily maintenance cron.

**Code**

- New `supabase/functions/_shared/dedupe.ts` exporting `claimDedupe(key, ttlSeconds, decision)` and `recordDedupeDecision(key, decision)`, following the existing `_shared/jobLock.ts` REST-RPC pattern (fail-open: on RPC error, return `claimed: true` so a database hiccup never blocks a repair).
- `error-auto-fix/index.ts`: `invokeFunction` claims `invoke:<name>` with a 30-minute TTL before calling `invokeFunctionUncached`, records the outcome afterwards, and returns `deduped_persisted: <earlier detail>` when suppressed. Response gains `suppressedInvocations`.
- `ops-watchdog/index.ts`: replace `acquireJobLock('dispatch:<name>', …)` with `claimDedupe('dispatch:<name>', DISPATCH_COOLDOWN_SECONDS, …)`; keep the in-run map and the run-scoped `acquireJobLock(JOB_NAME)` mutex as they are.
- No frontend changes.
