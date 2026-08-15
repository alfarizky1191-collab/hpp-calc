-- =============================================================================
-- Migration: 008_cleanup_stale_category_refs
-- Nullifies category_id on materials and menus that reference categories
-- which no longer exist (orphaned foreign key values from deleted categories).
-- =============================================================================

-- Clear stale category_id on materials
update public.materials
set category_id = null
where category_id is not null
  and not exists (
    select 1 from public.categories c
    where c.id = materials.category_id
  );

-- Clear stale category_id on menus
update public.menus
set category_id = null
where category_id is not null
  and not exists (
    select 1 from public.categories c
    where c.id = menus.category_id
  );
