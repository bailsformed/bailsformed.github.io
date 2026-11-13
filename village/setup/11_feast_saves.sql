-- =====================================================================
--  THE FAMILY VILLAGE: step 11, let Gage's game save to his account
--  Adds 'feast' (The Moveable Feast, /feast/) to the games game_saves
--  accepts, and keeps every other game (including 'underworld' from
--  10_underworld_saves.sql). Run ONCE in Supabase SQL Editor. Safe to run again,
--  and safe to run before or after 10.
-- =====================================================================
alter table public.game_saves drop constraint if exists game_saves_game_check;
alter table public.game_saves add constraint game_saves_game_check
  check (game in ('medquest', 'dungeon', 'nola', 'luke', 'freak', 'underworld', 'feast'));
