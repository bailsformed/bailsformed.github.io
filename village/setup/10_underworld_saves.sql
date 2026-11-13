-- =====================================================================
--  THE FAMILY VILLAGE: step 10, let The Underworld Apothecary save
--  Adds 'underworld' (/underworld/) to the games game_saves accepts.
--  Run ONCE in Supabase SQL Editor (after 09). Safe to run again.
--  Also allows 'feast' (Gage's game) so the two setup files can run in either order.
-- =====================================================================
alter table public.game_saves drop constraint if exists game_saves_game_check;
alter table public.game_saves add constraint game_saves_game_check
  check (game in ('medquest', 'dungeon', 'nola', 'luke', 'freak', 'underworld', 'feast'));
