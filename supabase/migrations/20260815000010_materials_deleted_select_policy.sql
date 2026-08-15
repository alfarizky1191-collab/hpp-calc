-- =============================================================================
-- Migration: 010_materials_deleted_select_policy
-- Allow OWNER/ADMIN to see soft-deleted materials.
--
-- The base SELECT policy only exposes rows where deleted_at is null. That keeps
-- STAFF read-only views clean, but it also means manager flows cannot reliably
-- receive/count a row after soft-delete or list deleted materials for restore.
-- =============================================================================

drop policy if exists "materials: owner/admin can view all" on public.materials;

create policy "materials: owner/admin can view all"
  on public.materials for select
  using (
    organization_id = public.get_my_org_id()
    and public.can_manage(array['OWNER','ADMIN']::public.user_role[])
  );
