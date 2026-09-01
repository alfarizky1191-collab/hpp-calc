-- Complete the security hardening identified by the September 2026 audit.

-- Anonymous visitors only need the public donation settings. RLS remains the
-- final row-level guard, but unnecessary base privileges are removed too.
revoke all privileges on all tables in schema public from anon;
grant select on table public.donation_settings to anon;

-- Signed-in application users need normal DML through RLS, never schema-level
-- capabilities such as TRUNCATE, TRIGGER, or REFERENCES.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- Audit rows are append-only and are written only through log_audit().
revoke insert, update, delete, truncate, references, trigger on table public.audit_logs from authenticated;
grant select on table public.audit_logs to authenticated;

create or replace function public.log_audit(
  p_action       public.audit_action,
  p_entity_type  text default null,
  p_entity_id    uuid default null,
  p_old_value    jsonb default null,
  p_new_value    jsonb default null,
  p_metadata     jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select organization_id into v_org_id
  from public.profiles
  where id = v_user_id;

  if v_org_id is null then
    raise exception 'Active organization membership required' using errcode = '42501';
  end if;

  if p_entity_type is not null and char_length(p_entity_type) > 100 then
    raise exception 'Entity type is too long' using errcode = '22001';
  end if;

  insert into public.audit_logs (
    organization_id, actor_id, action, entity_type, entity_id,
    old_value, new_value, metadata
  ) values (
    v_org_id, v_user_id, p_action, p_entity_type, p_entity_id,
    p_old_value, p_new_value, p_metadata
  );
end;
$$;

revoke execute on function public.log_audit(
  public.audit_action, text, uuid, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.log_audit(
  public.audit_action, text, uuid, jsonb, jsonb, jsonb
) to authenticated;

-- Shared rate limiter for all Vercel instances. Only opaque SHA-256 keys are
-- stored; raw IP addresses never enter the database.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.rate_limits (
  namespace text not null,
  identifier_hash text not null,
  request_at timestamptz not null default now()
);

create index if not exists rate_limits_lookup_idx
  on private.rate_limits (namespace, identifier_hash, request_at desc);

revoke all on table private.rate_limits from public, anon, authenticated;

create or replace function public.consume_rate_limit(
  p_namespace text,
  p_identifier_hash text
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_window interval;
  v_count integer;
  v_oldest timestamptz;
begin
  select limits.max_requests, limits.window_size
  into v_max, v_window
  from (values
    ('login'::text, 5, interval '15 minutes'),
    ('register', 5, interval '1 minute'),
    ('forgot-password', 5, interval '5 minutes'),
    ('import', 20, interval '1 minute'),
    ('export', 30, interval '1 minute')
  ) as limits(namespace, max_requests, window_size)
  where limits.namespace = p_namespace;

  if v_max is null or p_identifier_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid rate-limit request' using errcode = '22023';
  end if;

  -- Serialize checks for one key so concurrent requests cannot exceed the cap.
  perform pg_advisory_xact_lock(hashtextextended(p_namespace || ':' || p_identifier_hash, 0));

  delete from private.rate_limits
  where request_at < now() - interval '1 hour';

  select count(*), min(request_at)
  into v_count, v_oldest
  from private.rate_limits
  where namespace = p_namespace
    and identifier_hash = p_identifier_hash
    and request_at > now() - v_window;

  if v_count >= v_max then
    return query select false, 0, coalesce(v_oldest, now()) + v_window;
    return;
  end if;

  insert into private.rate_limits (namespace, identifier_hash)
  values (p_namespace, p_identifier_hash);

  return query select true, v_max - v_count - 1, coalesce(v_oldest, now()) + v_window;
end;
$$;

revoke execute on function public.consume_rate_limit(text, text) from public, authenticated;
grant execute on function public.consume_rate_limit(text, text) to anon;
