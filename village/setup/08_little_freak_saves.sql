-- =====================================================================
--  THE FAMILY VILLAGE: step 8, let Mom's game save to her account
--  Adds 'freak' (Unmarketable Little Freak, /little-freak/) to the games
--  game_saves accepts. Run ONCE in Supabase SQL Editor (after 07). Safe to run again.
-- =====================================================================
alter table public.game_saves drop constraint if exists game_saves_game_check;
alter table public.game_saves add constraint game_saves_game_check
  check (game in ('medquest', 'dungeon', 'nola', 'luke', 'freak'));
