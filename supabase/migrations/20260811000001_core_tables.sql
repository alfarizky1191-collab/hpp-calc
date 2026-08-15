-- =============================================================================
-- Migration: 001_core_tables
-- Core tables: organizations, profiles, categories
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('OWNER', 'ADMIN', 'STAFF');

create type public.material_status as enum ('ACTIVE', 'INACTIVE');

create type public.menu_status as enum ('ACTIVE', 'INACTIVE', 'DRAFT');

create type public.recipe_status as enum ('ACTIVE', 'DRAFT', 'ARCHIVED');

create type public.expense_category as enum (
  'GAS',
  'ELECTRICITY',
  'WATER',
  'RENT',
  'SALARY',
  'TRANSPORT',
  'MAINTENANCE',
  'CONDIMENT',
  'GENERAL_PACKAGING',
  'OTHER'
);

create type public.audit_action as enum (
  'LOGIN',
  'LOGOUT',
  'LOGIN_FAILED',
  'CREATE',
  'UPDATE',
  'DELETE',
  'PRICE_CHANGE',
  'IMPORT',
  'EXPORT',
  'ROLE_CHANGE',
  'SETTINGS_CHANGE'
);

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 255),
  slug        text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.organizations is
  'Tenant root. Every business object is scoped to an organization.';

-- ---------------------------------------------------------------------------
-- profiles
-- Extends auth.users with organization membership and role.
-- One user = one organization (MVP).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  role            public.user_role not null default 'STAFF',
  full_name       text check (char_length(full_name) <= 255),
  avatar_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.profiles is
  'User profile with organization membership and RBAC role.';

create index profiles_organization_id_idx on public.profiles (organization_id);

-- ---------------------------------------------------------------------------
-- categories
-- Shared lookup for material and menu categorization.
-- ---------------------------------------------------------------------------
create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 100),
  type            text not null check (type in ('MATERIAL', 'MENU')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (organization_id, name, type)
);

comment on table public.categories is
  'Categories for materials and menus, scoped to organization.';

create index categories_organization_id_idx on public.categories (organization_id);

-- ---------------------------------------------------------------------------
-- updated_at auto-update trigger function
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
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

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
