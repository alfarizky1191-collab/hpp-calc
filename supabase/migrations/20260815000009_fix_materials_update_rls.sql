-- =============================================================================
-- Migration: 009_fix_materials_update_rls
-- The SELECT policy on materials includes "deleted_at IS NULL" which blocks
-- UPDATE queries from matching rows via RLS row visibility check.
-- Fix: replace the two duplicate UPDATE policies with one that does NOT
-- restrict on deleted_at, so soft-delete (and restore) works correctly.
-- =============================================================================

drop policy if exists "materials: owner/admin can update" on public.materials;
drop policy if exists "materials: owner/admin can soft delete" on public.materials;

create policy "materials: owner/admin can update"
  on public.materials for update
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  )
  with check (
    organization_id = public.get_my_org_id()
  );
