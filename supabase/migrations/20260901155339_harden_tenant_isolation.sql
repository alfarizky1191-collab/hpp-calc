-- Lock tenant boundaries for profile and organization-scoped updates.

create or replace function public.protect_profile_tenant_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile identity cannot be changed'
      using errcode = '42501';
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'Profile organization cannot be changed'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    if auth.uid() = old.id
      or public.get_my_org_id() is distinct from old.organization_id
      or public.get_my_role() <> 'OWNER'::public.user_role then
      raise exception 'Profile role cannot be changed'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_tenant_fields() from public, anon, authenticated;

drop trigger if exists protect_profile_tenant_fields on public.profiles;
create trigger protect_profile_tenant_fields
before update on public.profiles
for each row execute function public.protect_profile_tenant_fields();

drop policy if exists "profiles: user can update own profile" on public.profiles;
create policy "profiles: user can update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check (
  (select auth.uid()) = id
  and organization_id = public.get_my_org_id()
);

drop policy if exists "profiles: owner can manage roles" on public.profiles;
create policy "profiles: owner can manage roles"
on public.profiles for update
to authenticated
using (
  organization_id = public.get_my_org_id()
  and public.get_my_role() = 'OWNER'::public.user_role
)
with check (
  organization_id = public.get_my_org_id()
  and public.get_my_role() = 'OWNER'::public.user_role
);

drop policy if exists "organizations: owner can update" on public.organizations;
create policy "organizations: owner can update"
on public.organizations for update
to authenticated
using (
  public.is_org_member(id)
  and public.get_my_role() = 'OWNER'::public.user_role
)
with check (
  public.is_org_member(id)
  and public.get_my_role() = 'OWNER'::public.user_role
);

drop policy if exists "categories: owner/admin can update" on public.categories;
create policy "categories: owner/admin can update"
on public.categories for update
to authenticated
using (
  organization_id = public.get_my_org_id()
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
)
with check (
  organization_id = public.get_my_org_id()
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
);

drop policy if exists "expenses: owner/admin can update" on public.expenses;
create policy "expenses: owner/admin can update"
on public.expenses for update
to authenticated
using (
  organization_id = public.get_my_org_id()
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
)
with check (
  organization_id = public.get_my_org_id()
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
);

drop policy if exists "materials: owner/admin can update" on public.materials;
create policy "materials: owner/admin can update"
on public.materials for update
to authenticated
using (
  organization_id = public.get_my_org_id()
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
)
with check (
  organization_id = public.get_my_org_id()
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
);

drop policy if exists "menus: owner/admin can update" on public.menus;
create policy "menus: owner/admin can update"
on public.menus for update
to authenticated
using (
  organization_id = public.get_my_org_id()
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
)
with check (
  organization_id = public.get_my_org_id()
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
);

drop policy if exists "packaging_costs: owner/admin can update" on public.packaging_costs;
create policy "packaging_costs: owner/admin can update"
on public.packaging_costs for update
to authenticated
using (
  exists (
    select 1 from public.menus m
    where m.id = packaging_costs.menu_id
      and m.organization_id = public.get_my_org_id()
  )
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
)
with check (
  exists (
    select 1 from public.menus m
    where m.id = packaging_costs.menu_id
      and m.organization_id = public.get_my_org_id()
  )
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
);

drop policy if exists "recipes: owner/admin can update" on public.recipes;
create policy "recipes: owner/admin can update"
on public.recipes for update
to authenticated
using (
  exists (
    select 1 from public.menus m
    where m.id = recipes.menu_id
      and m.organization_id = public.get_my_org_id()
  )
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
)
with check (
  exists (
    select 1 from public.menus m
    where m.id = recipes.menu_id
      and m.organization_id = public.get_my_org_id()
  )
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
);

drop policy if exists "recipe_items: owner/admin can update" on public.recipe_items;
create policy "recipe_items: owner/admin can update"
on public.recipe_items for update
to authenticated
using (
  exists (
    select 1
    from public.recipes r
    join public.menus m on m.id = r.menu_id
    where r.id = recipe_items.recipe_id
      and m.organization_id = public.get_my_org_id()
  )
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
)
with check (
  exists (
    select 1
    from public.recipes r
    join public.menus m on m.id = r.menu_id
    where r.id = recipe_items.recipe_id
      and m.organization_id = public.get_my_org_id()
  )
  and public.can_manage(array['OWNER', 'ADMIN']::public.user_role[])
);

-- Trigger-only functions must not be callable through the Data API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_single_active_recipe() from public, anon, authenticated;
revoke execute on function public.log_material_price_change() from public, anon, authenticated;
revoke execute on function public.prevent_audit_log_mutation() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- Authorization helpers are only needed by signed-in users and RLS.
revoke execute on function public.get_my_org_id() from public, anon;
revoke execute on function public.get_my_role() from public, anon;
revoke execute on function public.is_org_member(uuid) from public, anon;
revoke execute on function public.can_manage(public.user_role[]) from public, anon;
grant execute on function public.get_my_org_id() to authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.can_manage(public.user_role[]) to authenticated;
