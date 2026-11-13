-- =====================================================================
--  THE FAMILY VILLAGE: step 10, let Gage's game save to his account
--  Adds 'feast' (The Moveable Feast, /feast/) to the games game_saves
--  accepts, and keeps every game that was already allowed.
--  Run ONCE in Supabase SQL Editor (after 08). Safe to run again.
-- =====================================================================
alter table public.game_saves drop constraint if exists game_saves_game_check;
alter table public.game_saves add constraint game_saves_game_check
  check (game in ('medquest', 'dungeon', 'nola', 'luke', 'freak', 'feast'));
