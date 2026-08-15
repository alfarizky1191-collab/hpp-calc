-- =============================================================================
-- Migration: fix hpp_calculations menu_id FK
--
-- Problem: hpp_calculations.menu_id uses ON DELETE RESTRICT, which prevents
-- deleting a menu that has associated HPP calculations.
--
-- Fix: Change to ON DELETE CASCADE so that when a menu is deleted, its
-- associated HPP calculation snapshots are also deleted (unlike recipe_id
-- which uses SET NULL because recipes can be deleted independently).
-- =============================================================================

-- 1. Drop the existing RESTRICT constraint
alter table public.hpp_calculations
  drop constraint hpp_calculations_menu_id_fkey;

-- 2. Re-add with ON DELETE CASCADE
alter table public.hpp_calculations
  add constraint hpp_calculations_menu_id_fkey
  foreign key (menu_id)
  references public.menus(id)
  on delete cascade;
