-- =============================================================================
-- Migration: 005_helper_functions
-- Helper functions used by RLS policies and application logic.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- get_my_org_id()
-- Returns the organization_id of the currently authenticated user.
-- Used in RLS policies to avoid repeated subqueries.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

comment on function public.get_my_org_id() is
  'Returns organization_id of the current user. Used in RLS policies.';

-- ---------------------------------------------------------------------------
-- get_my_role()
-- Returns the role of the currently authenticated user.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

comment on function public.get_my_role() is
  'Returns role of the current user. Used in RLS policies.';

-- ---------------------------------------------------------------------------
-- is_org_member(org_id)
-- Returns true if current user belongs to the given organization.
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and organization_id = org_id
  );
$$;

-- ---------------------------------------------------------------------------
-- log_audit(action, entity_type, entity_id, old_value, new_value, metadata)
-- Convenience function to insert into audit_logs.
-- Call from server actions; never from client-side code.
-- ---------------------------------------------------------------------------
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
begin
  insert into public.audit_logs (
    organization_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value,
    metadata
  ) values (
    public.get_my_org_id(),
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_value,
    p_new_value,
    p_metadata
  );
end;
$$;

comment on function public.log_audit(
  public.audit_action, text, uuid, jsonb, jsonb, jsonb
) is
  'Convenience function to append a row to audit_logs.';

-- ---------------------------------------------------------------------------
-- can_manage(required_roles)
-- Check if current user has one of the specified roles.
-- Used for RBAC checks in RLS policies.
-- ---------------------------------------------------------------------------
create or replace function public.can_manage(
  required_roles public.user_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = any(required_roles)
  );
$$;
