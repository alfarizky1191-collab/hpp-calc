-- =============================================================================
-- Migration: fix hpp_calculations recipe_id FK
--
-- Problem: hpp_calculations.recipe_id uses ON DELETE RESTRICT, which prevents
-- deleting a recipe that has associated HPP calculations.
--
-- Fix: Change to ON DELETE SET NULL so that HPP calculation snapshots are
-- preserved (they are immutable historical records) but the recipe can still
-- be deleted. The recipe_id column must be made nullable first.
-- =============================================================================

-- 1. Make recipe_id nullable (snapshots remain valid without a live recipe)
alter table public.hpp_calculations
  alter column recipe_id drop not null;

-- 2. Drop the existing RESTRICT constraint
alter table public.hpp_calculations
  drop constraint hpp_calculations_recipe_id_fkey;

-- 3. Re-add with ON DELETE SET NULL
alter table public.hpp_calculations
  add constraint hpp_calculations_recipe_id_fkey
  foreign key (recipe_id)
  references public.recipes(id)
  on delete set null;
