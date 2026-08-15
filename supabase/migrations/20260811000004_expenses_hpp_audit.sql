-- =============================================================================
-- Migration: 004_expenses_hpp_audit
-- Tables: expenses, hpp_calculations, audit_logs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- expenses
-- Operating expenses / overhead per organization.
-- ---------------------------------------------------------------------------
create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 255),
  category        public.expense_category not null,
  amount          numeric(15,2) not null check (amount >= 0),
  -- Period in YYYY-MM format, e.g. '2024-08'
  period          char(7) not null check (period ~ '^\d{4}-\d{2}$'),
  expense_date    date not null,
  notes           text,
  created_by      uuid not null references auth.users(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.expenses is
  'Biaya operasional/overhead per periode. Dasar alokasi overhead ke HPP.';

comment on column public.expenses.period is
  'Format YYYY-MM, e.g. 2024-08. Used for period-based reporting.';

create index expenses_organization_id_idx on public.expenses (organization_id);
create index expenses_organization_period_idx on public.expenses (organization_id, period);

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- hpp_calculations
-- Immutable snapshot of each HPP calculation.
-- Historical records must never be altered when prices change.
-- ---------------------------------------------------------------------------
create table public.hpp_calculations (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  menu_id             uuid not null references public.menus(id) on delete restrict,
  recipe_id           uuid not null references public.recipes(id) on delete restrict,

  -- Snapshot values — frozen at time of calculation
  material_cost       numeric(18,2) not null check (material_cost >= 0),
  packaging_cost      numeric(18,2) not null check (packaging_cost >= 0),
  overhead_cost       numeric(18,2) not null check (overhead_cost >= 0),
  other_cost          numeric(18,2) not null default 0 check (other_cost >= 0),
  total_hpp           numeric(18,2) not null check (total_hpp >= 0),
  selling_price       numeric(15,2) not null check (selling_price >= 0),

  -- Derived metrics, stored for historical reporting
  food_cost           numeric(7,4) not null,  -- percentage
  profit              numeric(18,2) not null,
  margin              numeric(7,4) not null,  -- percentage

  -- Formula version for reproducibility
  calculation_version text not null default 'hpp-engine-v1',
  calculated_by       uuid references auth.users(id) on delete set null,
  calculated_at       timestamptz not null default now(),
  notes               text
);

comment on table public.hpp_calculations is
  'Immutable snapshot HPP. Historical records tetap valid walaupun harga berubah.';

comment on column public.hpp_calculations.calculation_version is
  'hpp-engine-v1, hpp-engine-v2, etc. Untuk reproducibility historical calculations.';

create index hpp_calculations_organization_id_idx
  on public.hpp_calculations (organization_id);
create index hpp_calculations_menu_id_idx
  on public.hpp_calculations (menu_id, calculated_at desc);
create index hpp_calculations_org_date_idx
  on public.hpp_calculations (organization_id, calculated_at desc);

-- ---------------------------------------------------------------------------
-- audit_logs
-- Append-only audit trail. Application must never UPDATE or DELETE rows.
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id        uuid references auth.users(id) on delete set null,
  action          public.audit_action not null,
  entity_type     text check (char_length(entity_type) <= 100),
  entity_id       uuid,
  -- JSON snapshots of before/after state
  old_value       jsonb,
  new_value       jsonb,
  -- Extra context: IP address, user agent, etc.
  metadata        jsonb,
  -- Immutable timestamp
  created_at      timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only audit log. No UPDATE or DELETE allowed from application layer.';

create index audit_logs_organization_id_idx
  on public.audit_logs (organization_id, created_at desc);
create index audit_logs_actor_id_idx
  on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id)
  where entity_type is not null;

-- Prevent UPDATE and DELETE on audit_logs from any role except postgres
create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only. UPDATE and DELETE are not permitted.';
end;
$$;

create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.prevent_audit_log_mutation();

create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.prevent_audit_log_mutation();
