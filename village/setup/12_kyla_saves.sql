-- =====================================================================
--  THE FAMILY VILLAGE: step 12, let Kyla's game save to her account
--  Adds 'kyla' (Gremlin Town, /kyla/) to the games game_saves accepts,
--  and keeps every other game. Run ONCE in Supabase SQL Editor.
--  Safe to run again, and safe to run before or after 10 and 11.
-- =====================================================================
alter table public.game_saves drop constraint if exists game_saves_game_check;
alter table public.game_saves add constraint game_saves_game_check
  check (game in ('medquest', 'dungeon', 'nola', 'luke', 'freak', 'underworld', 'feast', 'kyla'));
