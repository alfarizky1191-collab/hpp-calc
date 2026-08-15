-- =============================================================================
-- Migration: 002_materials
-- Tables: materials, material_price_history
-- =============================================================================

-- ---------------------------------------------------------------------------
-- materials
-- ---------------------------------------------------------------------------
create table public.materials (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  category_id      uuid references public.categories(id) on delete set null,
  name             text not null check (char_length(name) between 1 and 255),
  purchase_unit    text not null check (char_length(purchase_unit) between 1 and 50),
  purchase_price   numeric(15,2) not null check (purchase_price >= 0),
  package_quantity numeric(15,4) not null check (package_quantity > 0),
  base_unit        text not null check (char_length(base_unit) between 1 and 50),
  -- Computed: purchase_price / package_quantity, stored for query performance
  unit_cost        numeric(18,6) not null generated always as
                     (purchase_price / package_quantity) stored,
  supplier         text check (char_length(supplier) <= 255),
  notes            text,
  status           public.material_status not null default 'ACTIVE',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  deleted_by       uuid references auth.users(id) on delete set null
);

comment on table public.materials is
  'Master bahan baku. unit_cost dihitung otomatis dari purchase_price / package_quantity.';

comment on column public.materials.unit_cost is
  'Harga per satuan terkecil = purchase_price / package_quantity. Generated column.';

create index materials_organization_id_idx on public.materials (organization_id);
create index materials_organization_status_idx on public.materials (organization_id, status)
  where deleted_at is null;
create index materials_category_id_idx on public.materials (category_id);

create trigger materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- material_price_history
-- Immutable log of price changes — never update or delete rows here.
-- ---------------------------------------------------------------------------
create table public.material_price_history (
  id           uuid primary key default gen_random_uuid(),
  material_id  uuid not null references public.materials(id) on delete cascade,
  old_price    numeric(15,2) not null check (old_price >= 0),
  new_price    numeric(15,2) not null check (new_price >= 0),
  changed_by   uuid not null references auth.users(id) on delete restrict,
  notes        text,
  created_at   timestamptz not null default now()
);

comment on table public.material_price_history is
  'Immutable price change log. Append-only from application side.';

create index material_price_history_material_id_idx
  on public.material_price_history (material_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Auto-log price history when purchase_price changes
-- ---------------------------------------------------------------------------
create or replace function public.log_material_price_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.purchase_price <> new.purchase_price then
    insert into public.material_price_history (
      material_id, old_price, new_price, changed_by
    ) values (
      new.id,
      old.purchase_price,
      new.purchase_price,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create trigger materials_price_change
  after update of purchase_price on public.materials
  for each row execute function public.log_material_price_change();
