# Configuration

## Environment variables

Copy `.env.example` to `.env` and populate the values.

### Frontend (Vite)

| Variable                        | Required | Description                                       |
| ------------------------------- | -------- | ------------------------------------------------- |
| `VITE_SUPABASE_URL`             | Yes      | Supabase project URL used by the frontend client. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes      | Supabase anon/publishable key.                    |

### Supabase Edge Functions

| Variable                      | Required | Description                                                    |
| ----------------------------- | -------- | -------------------------------------------------------------- |
| `SUPABASE_URL`                | Yes      | Supabase project URL for server-side clients.                  |
| `SUPABASE_ANON_KEY`           | Yes      | Supabase anon key for public calls (warmup).                   |
| `SUPABASE_SERVICE_ROLE_KEY`   | Yes      | Service role key for cache/rules tables.                       |
| `LOVABLE_API_KEY`             | Yes      | API key for the AI gateway used in query translation.          |
| `LOG_ALL_TRANSLATIONS`        | No       | Set to `true` to log all translations (debug only).            |
| `RUN_QUERY_VALIDATION_CHECKS` | No       | Set to `true` to validate against Scryfall during translation. |

## Cache controls

The semantic search edge function accepts a `useCache` flag in the request body. Set `useCache: false` to bypass all cache layers for debugging.

## Scheduled jobs

Cron jobs are registered in the database using `pg_cron` (enabled via migration). They fire HTTP requests to edge functions via `pg_net`.

| Job name | Schedule | Function | Purpose |
| --- | --- | --- | --- |
| `price-snapshot-nightly` | `0 1 * * *` (01:00 UTC) | `price-snapshot` | Capture price snapshots from Scryfall for all collection cards |
| `cleanup-logs-nightly` | `0 2 * * *` (02:00 UTC) | `cleanup-logs` | Delete old translation logs and analytics events |
| `generate-patterns-nightly` | `0 3 * * *` (03:00 UTC) | `generate-patterns` | Promote high-confidence translation logs into rules |
| `spicerack-import-daily` | `0 4 * * *` (04:00 UTC) | `spicerack-import` | Import tournament decklists from Spicerack API |
| `mtgjson-import-weekly` | `0 5 * * 0` (05:00 UTC Sun) | `mtgjson-import` | Import MTGJSON AllDecks dataset (chunked, 50 per run) |
| `card-sync-daily` | `0 6 * * *` (06:00 UTC) | `card-sync` | Sync Scryfall card metadata for imported deck cards |
| `cooccurrence-nightly` | `0 7 * * *` (07:00 UTC) | `compute-cooccurrence` | Recompute card co-occurrence synergy graph |
| `detect-archetypes-daily` | `0 8 * * *` (08:00 UTC) | `detect-archetypes` | Tag unclassified community decks with archetype labels |

### Verifying job registration

```sql
-- Confirm both jobs are registered
select jobname, schedule, active from cron.job
where jobname in ('cleanup-logs-nightly', 'generate-patterns-nightly');

-- Check recent run results
select jobname, status, return_message, start_time
from cron.job_run_details
where jobname in ('cleanup-logs-nightly', 'generate-patterns-nightly')
order by start_time desc
limit 10;
```

### Adding a new cron job

Use `cron.schedule()` via `supabase--insert` (not a migration) since the call embeds live project credentials:

```sql
select cron.schedule(
  'my-job-name',
  '0 2 * * *',
  $$
  select net.http_post(
    url     := 'https://<project-ref>.supabase.co/functions/v1/<function-name>',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon-key>"}'::jsonb,
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
```
