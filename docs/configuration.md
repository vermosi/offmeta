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
| `generate-patterns-nightly` | `0 3 * * *` (03:00 UTC) | `generate-patterns` | Promote high-confidence translation logs (≥3 occurrences, ≥0.8 confidence) into `translation_rules` |

### Verifying job registration

```sql
-- Confirm the job is registered
select jobname, schedule, active from cron.job where jobname = 'generate-patterns-nightly';

-- Check recent run results (the morning after first execution)
select jobname, status, return_message, start_time
from cron.job_run_details
where jobname = 'generate-patterns-nightly'
order by start_time desc
limit 5;
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
