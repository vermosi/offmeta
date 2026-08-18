create or replace function public.trigger_pipeline_job(fn text, timeout_ms integer default 60000)
returns bigint
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  req_id bigint;
begin
  if fn !~ '^[a-z0-9-]{2,60}$' then
    raise exception 'invalid function name';
  end if;
  select net.http_post(
    url := 'https://nxmzyykkzwomkcentctt.supabase.co/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'source','pg_cron',
      'pipeline_key', (select decrypted_secret from vault.decrypted_secrets where name = 'OFFMETA_PIPELINE_KEY' limit 1)
    ),
    timeout_milliseconds := timeout_ms
  ) into req_id;
  return req_id;
end;
$$;

revoke all on function public.trigger_pipeline_job(text, integer) from public, anon, authenticated;
grant execute on function public.trigger_pipeline_job(text, integer) to service_role;