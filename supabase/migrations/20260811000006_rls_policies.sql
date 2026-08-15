-- =============================================================================
-- Migration: 006_rls_policies
-- Row Level Security for all tenant-owned tables.
--
-- Principle: Every table with organization_id is isolated per tenant.
-- Users can only see and modify data from their own organization.
-- RBAC: Owner/Admin = full write, Staff = read-only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

-- Users can only see their own organization
create policy "organizations: member can view"
  on public.organizations for select
  using (public.is_org_member(id));

-- Only OWNER can update organization settings
create policy "organizations: owner can update"
  on public.organizations for update
  using (
    public.is_org_member(id)
    and public.get_my_role() = 'OWNER'
  );

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Users can view all profiles in their organization
create policy "profiles: member can view own org"
  on public.profiles for select
  using (organization_id = public.get_my_org_id());

-- Users can update their own profile
create policy "profiles: user can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Only OWNER can manage other users' roles
create policy "profiles: owner can manage roles"
  on public.profiles for update
  using (
    organization_id = public.get_my_org_id()
    and public.get_my_role() = 'OWNER'
  );

-- System creates profile on signup via trigger (no direct insert from client)
create policy "profiles: system insert only"
  on public.profiles for insert
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;

create policy "categories: member can view"
  on public.categories for select
  using (organization_id = public.get_my_org_id());

create policy "categories: owner/admin can insert"
  on public.categories for insert
  with check (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "categories: owner/admin can update"
  on public.categories for update
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "categories: owner/admin can delete"
  on public.categories for delete
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- ---------------------------------------------------------------------------
-- materials
-- ---------------------------------------------------------------------------
alter table public.materials enable row level security;

create policy "materials: member can view"
  on public.materials for select
  using (
    organization_id = public.get_my_org_id()
    and deleted_at is null
  );

create policy "materials: owner/admin can insert"
  on public.materials for insert
  with check (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "materials: owner/admin can update"
  on public.materials for update
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- Soft delete only — no hard delete from application
create policy "materials: owner/admin can soft delete"
  on public.materials for update
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- ---------------------------------------------------------------------------
-- material_price_history
-- Append-only from application. No update/delete.
-- ---------------------------------------------------------------------------
alter table public.material_price_history enable row level security;

create policy "material_price_history: member can view own org"
  on public.material_price_history for select
  using (
    exists (
      select 1 from public.materials m
      where m.id = material_id
        and m.organization_id = public.get_my_org_id()
    )
  );

-- Insert handled by trigger, but allow direct insert by owner/admin
create policy "material_price_history: system/owner/admin can insert"
  on public.material_price_history for insert
  with check (
    exists (
      select 1 from public.materials m
      where m.id = material_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- ---------------------------------------------------------------------------
-- menus
-- ---------------------------------------------------------------------------
alter table public.menus enable row level security;

create policy "menus: member can view"
  on public.menus for select
  using (organization_id = public.get_my_org_id());

create policy "menus: owner/admin can insert"
  on public.menus for insert
  with check (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "menus: owner/admin can update"
  on public.menus for update
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "menus: owner/admin can delete"
  on public.menus for delete
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- ---------------------------------------------------------------------------
-- recipes
-- Isolated via menu → organization_id
-- ---------------------------------------------------------------------------
alter table public.recipes enable row level security;

create policy "recipes: member can view own org"
  on public.recipes for select
  using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.organization_id = public.get_my_org_id()
    )
  );

create policy "recipes: owner/admin can insert"
  on public.recipes for insert
  with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "recipes: owner/admin can update"
  on public.recipes for update
  using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "recipes: owner/admin can delete"
  on public.recipes for delete
  using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- ---------------------------------------------------------------------------
-- recipe_items
-- Isolated via recipe → menu → organization_id
-- ---------------------------------------------------------------------------
alter table public.recipe_items enable row level security;

create policy "recipe_items: member can view own org"
  on public.recipe_items for select
  using (
    exists (
      select 1
      from public.recipes r
      join public.menus m on m.id = r.menu_id
      where r.id = recipe_id
        and m.organization_id = public.get_my_org_id()
    )
  );

create policy "recipe_items: owner/admin can insert"
  on public.recipe_items for insert
  with check (
    exists (
      select 1
      from public.recipes r
      join public.menus m on m.id = r.menu_id
      where r.id = recipe_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "recipe_items: owner/admin can update"
  on public.recipe_items for update
  using (
    exists (
      select 1
      from public.recipes r
      join public.menus m on m.id = r.menu_id
      where r.id = recipe_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "recipe_items: owner/admin can delete"
  on public.recipe_items for delete
  using (
    exists (
      select 1
      from public.recipes r
      join public.menus m on m.id = r.menu_id
      where r.id = recipe_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- ---------------------------------------------------------------------------
-- packaging_costs
-- Isolated via menu → organization_id
-- ---------------------------------------------------------------------------
alter table public.packaging_costs enable row level security;

create policy "packaging_costs: member can view own org"
  on public.packaging_costs for select
  using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.organization_id = public.get_my_org_id()
    )
  );

create policy "packaging_costs: owner/admin can insert"
  on public.packaging_costs for insert
  with check (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "packaging_costs: owner/admin can update"
  on public.packaging_costs for update
  using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "packaging_costs: owner/admin can delete"
  on public.packaging_costs for delete
  using (
    exists (
      select 1 from public.menus m
      where m.id = menu_id
        and m.organization_id = public.get_my_org_id()
    )
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
alter table public.expenses enable row level security;

create policy "expenses: member can view"
  on public.expenses for select
  using (organization_id = public.get_my_org_id());

create policy "expenses: owner/admin can insert"
  on public.expenses for insert
  with check (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "expenses: owner/admin can update"
  on public.expenses for update
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

create policy "expenses: owner/admin can delete"
  on public.expenses for delete
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- ---------------------------------------------------------------------------
-- hpp_calculations
-- Append-only from application. No update/delete once saved.
-- ---------------------------------------------------------------------------
alter table public.hpp_calculations enable row level security;

create policy "hpp_calculations: member can view"
  on public.hpp_calculations for select
  using (organization_id = public.get_my_org_id());

create policy "hpp_calculations: owner/admin can insert"
  on public.hpp_calculations for insert
  with check (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );

-- No update/delete — calculations are immutable snapshots

-- ---------------------------------------------------------------------------
-- audit_logs
-- Append-only. Owner can view. Admin can view. Staff cannot.
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy "audit_logs: owner can view"
  on public.audit_logs for select
  using (
    organization_id = public.get_my_org_id()
    and public.get_my_role() = 'OWNER'
  );

create policy "audit_logs: admin can view"
  on public.audit_logs for select
  using (
    organization_id = public.get_my_org_id()
    and public.get_my_role() = 'ADMIN'
  );

-- Insert via log_audit() function (security definer — bypasses RLS)
-- Direct insert from anon/service role not permitted
create policy "audit_logs: deny direct insert"
  on public.audit_logs for insert
  with check (false);
