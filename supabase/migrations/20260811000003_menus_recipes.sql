-- =============================================================================
-- Migration: 003_menus_recipes
-- Tables: menus, recipes, recipe_items, packaging_costs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- menus
-- ---------------------------------------------------------------------------
create table public.menus (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  category_id      uuid references public.categories(id) on delete set null,
  name             text not null check (char_length(name) between 1 and 255),
  description      text,
  selling_price    numeric(15,2) not null check (selling_price >= 0),
  -- Target food cost as percentage, e.g. 30.00 = 30%
  target_food_cost numeric(5,2) not null default 30.00
    check (target_food_cost > 0 and target_food_cost <= 100),
  status           public.menu_status not null default 'DRAFT',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.menus is
  'Menu produk. Setiap menu bisa punya banyak versi resep.';

comment on column public.menus.target_food_cost is
  'Target food cost percentage (0-100). Digunakan untuk smart pricing.';

create index menus_organization_id_idx on public.menus (organization_id);
create index menus_organization_status_idx on public.menus (organization_id, status);

create trigger menus_updated_at
  before update on public.menus
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- recipes
-- A menu can have multiple versioned recipes.
-- Only one recipe can be 'ACTIVE' per menu.
-- ---------------------------------------------------------------------------
create table public.recipes (
  id             uuid primary key default gen_random_uuid(),
  menu_id        uuid not null references public.menus(id) on delete cascade,
  version        integer not null default 1 check (version > 0),
  yield_quantity numeric(15,4) not null check (yield_quantity > 0),
  yield_unit     text not null check (char_length(yield_unit) between 1 and 50),
  notes          text,
  status         public.recipe_status not null default 'DRAFT',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (menu_id, version)
);

comment on table public.recipes is
  'Resep per menu. Support versioning. Satu resep ACTIVE per menu.';

create index recipes_menu_id_idx on public.recipes (menu_id);
create index recipes_menu_active_idx on public.recipes (menu_id, status)
  where status = 'ACTIVE';

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- Enforce only one ACTIVE recipe per menu
create or replace function public.enforce_single_active_recipe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ACTIVE' then
    update public.recipes
    set status = 'ARCHIVED'
    where menu_id = new.menu_id
      and id <> new.id
      and status = 'ACTIVE';
  end if;
  return new;
end;
$$;

create trigger recipes_single_active
  before insert or update of status on public.recipes
  for each row execute function public.enforce_single_active_recipe();

-- ---------------------------------------------------------------------------
-- recipe_items
-- ---------------------------------------------------------------------------
create table public.recipe_items (
  id                  uuid primary key default gen_random_uuid(),
  recipe_id           uuid not null references public.recipes(id) on delete cascade,
  material_id         uuid not null references public.materials(id) on delete restrict,
  quantity            numeric(15,4) not null check (quantity >= 0),
  unit                text not null check (char_length(unit) between 1 and 50),
  -- Snapshot of unit_cost at time of calculation — immutable after set
  unit_cost_snapshot  numeric(18,6) not null check (unit_cost_snapshot >= 0),
  -- Computed: quantity * unit_cost_snapshot
  total_cost          numeric(18,2) not null generated always as
                        (quantity * unit_cost_snapshot) stored,
  created_at          timestamptz not null default now(),

  unique (recipe_id, material_id)
);

comment on table public.recipe_items is
  'Bahan dalam resep. unit_cost_snapshot dikunci saat kalkulasi.';

comment on column public.recipe_items.unit_cost_snapshot is
  'Snapshot harga unit saat resep dibuat. Tidak berubah jika harga bahan naik.';

create index recipe_items_recipe_id_idx on public.recipe_items (recipe_id);
create index recipe_items_material_id_idx on public.recipe_items (material_id);

-- ---------------------------------------------------------------------------
-- packaging_costs
-- Per-menu packaging cost line items.
-- ---------------------------------------------------------------------------
create table public.packaging_costs (
  id          uuid primary key default gen_random_uuid(),
  menu_id     uuid not null references public.menus(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 100),
  quantity    numeric(15,4) not null default 1 check (quantity >= 0),
  unit_cost   numeric(18,6) not null check (unit_cost >= 0),
  total_cost  numeric(18,2) not null generated always as
                (quantity * unit_cost) stored,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.packaging_costs is
  'Biaya kemasan per menu (cup, sedotan, stiker, dll).';

create index packaging_costs_menu_id_idx on public.packaging_costs (menu_id);

create trigger packaging_costs_updated_at
  before update on public.packaging_costs
  for each row execute function public.set_updated_at();
