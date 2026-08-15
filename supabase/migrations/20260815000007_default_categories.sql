-- =============================================================================
-- Migration: 007_default_categories
-- Seeds default categories (Makanan, Minuman) for MATERIAL and MENU types.
--
-- 1. Inserts default categories for all EXISTING organizations.
-- 2. Updates handle_new_user() trigger to also create default categories
--    for every NEW organization created on signup.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Seed default categories for all EXISTING organizations
-- (ON CONFLICT DO NOTHING prevents duplicates if migration is re-run)
-- ---------------------------------------------------------------------------
insert into public.categories (organization_id, name, type)
select
  o.id,
  defaults.name,
  defaults.type
from
  public.organizations o
  cross join (
    values
      ('Makanan', 'MATERIAL'),
      ('Minuman', 'MATERIAL'),
      ('Makanan', 'MENU'),
      ('Minuman', 'MENU')
  ) as defaults (name, type)
on conflict (organization_id, name, type) do nothing;

-- ---------------------------------------------------------------------------
-- Update handle_new_user() to also seed default categories for new orgs
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid;
begin
  -- Create a new organization for the user
  insert into public.organizations (name)
  values (coalesce(new.raw_user_meta_data->>'organization_name', 'My Organization'))
  returning id into v_org_id;

  -- Create profile with OWNER role (first user of org = owner)
  insert into public.profiles (id, organization_id, role, full_name)
  values (
    new.id,
    v_org_id,
    'OWNER',
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );

  -- Seed default categories for the new organization
  insert into public.categories (organization_id, name, type)
  values
    (v_org_id, 'Makanan', 'MATERIAL'),
    (v_org_id, 'Minuman', 'MATERIAL'),
    (v_org_id, 'Makanan', 'MENU'),
    (v_org_id, 'Minuman', 'MENU');

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Auto-creates organization, profile, and default categories on new user signup.';
