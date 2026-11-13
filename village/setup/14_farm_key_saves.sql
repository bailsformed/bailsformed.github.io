-- =====================================================================
--  step 14: cloud saves by a private key (no account needed)
--  For Sunbeam Farm (/ashley/), whose player is NOT on the Village.
--  The game makes a long random "farm key"; saves are stored under a
--  SHA-256 hash of that key, so the key itself never sits in the database.
--  The table has no direct access at all, only the two functions below.
--  Separate from game_saves and from every Village table.
--  Run ONCE in Supabase SQL Editor. Safe to run again.
-- =====================================================================
create table if not exists public.key_saves (
  key_hash   text   primary key,
  game       text   not null check (game in ('ashley')),
  state      text   not null check (char_length(state) <= 2000000),
  updated_ms bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.key_saves enable row level security;
-- no policies on purpose: nobody can select/insert/update the table directly
revoke all on public.key_saves from anon, authenticated;

create or replace function public.key_save_hash(p_key text) returns text
language sql immutable set search_path = public as $$
  select encode(sha256(convert_to(p_key, 'UTF8')), 'hex')
$$;

create or replace function public.key_save_get(p_key text, p_game text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_row public.key_saves%rowtype;
begin
  if p_key is null or char_length(p_key) < 24 or char_length(p_key) > 100 then
    return jsonb_build_object('ok', false);
  end if;
  select * into v_row from public.key_saves
   where key_hash = public.key_save_hash(p_key) and game = p_game;
  return jsonb_build_object('ok', true, 'state', v_row.state, 'updated_ms', v_row.updated_ms);
end $$;

-- only ever replaces an older save with a newer one
create or replace function public.key_save_put(p_key text, p_game text, p_state text, p_updated bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_hash text; v_now bigint;
begin
  if p_key is null or char_length(p_key) < 24 or char_length(p_key) > 100 then
    return jsonb_build_object('ok', false);
  end if;
  v_hash := public.key_save_hash(p_key);
  insert into public.key_saves (key_hash, game, state, updated_ms)
       values (v_hash, p_game, p_state, p_updated)
  on conflict (key_hash) do update
       set state = excluded.state, updated_ms = excluded.updated_ms, updated_at = now()
     where public.key_saves.updated_ms < excluded.updated_ms
       and public.key_saves.game = excluded.game;
  select updated_ms into v_now from public.key_saves where key_hash = v_hash;
  return jsonb_build_object('ok', true, 'updated_ms', v_now);
end $$;

revoke all on function public.key_save_get(text, text) from public;
revoke all on function public.key_save_put(text, text, text, bigint) from public;
grant execute on function public.key_save_get(text, text) to anon, authenticated;
grant execute on function public.key_save_put(text, text, text, bigint) to anon, authenticated;
