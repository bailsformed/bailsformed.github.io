-- =====================================================================
--  THE POT: step 2, remember WHEN a balance was set (not just the day),
--  so spending you log later that same day still lowers the balance.
--  Run ONCE in Supabase SQL Editor (after 01_pot.sql). Safe to run again.
-- =====================================================================
alter table public.pot_accounts add column if not exists balance_set_at timestamptz;
