-- =====================================================================
--  THE FAMILY VILLAGE: step 7, game saves + two safety fixes
--  Run ONCE in Supabase SQL Editor (after 06). Safe to run again.
--   1. The four games (MedQuest, Dungeon, Magnolia Isle, Open Field) save
--      to the player's Village account, or to PB's Pot login for the Dungeon.
--   2. Memes can be fully deleted from any of your devices.
--   3. Wrong family codes are limited: 10 misses locks that device for 15 min.
-- =====================================================================

-- ---------- 1. GAME SAVES ----------
create table if not exists public.game_saves (
  owner      text   not null,                 -- 'member:<village id>' or 'user:<pot login id>'
  game       text   not null check (game in ('medquest', 'dungeon', 'nola', 'luke')),
  state      text   not null check (char_length(state) <= 2000000),
  updated_ms bigint not null,                 -- the game's own "last changed" clock
  saved_at   timestamptz not null default now(),
  primary key (owner, game)
);
alter table public.game_saves enable row level security;
-- no policies on purpose: only the two functions below can read or write saves

-- whose save is this? A Village resident, else a real (email) Pot login, else nobody.
create or replace function public.game_save_owner() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    'member:' || public.my_member_id()::text,
    case when auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
         then 'user:' || auth.uid()::text end)
$$;

create or replace function public.game_save_get(p_game text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_owner text := public.game_save_owner(); v_row public.game_saves%rowtype;
begin
  if v_owner is null then return jsonb_build_object('account', false); end if;
  select * into v_row from public.game_saves where owner = v_owner and game = p_game;
  return jsonb_build_object('account', true, 'state', v_row.state, 'updated_ms', v_row.updated_ms);
end $$;

-- only ever replaces an older save with a newer one
create or replace function public.game_save_put(p_game text, p_state text, p_updated bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_owner text := public.game_save_owner(); v_now bigint;
begin
  if v_owner is null then return jsonb_build_object('account', false); end if;
  insert into public.game_saves (owner, game, state, updated_ms) values (v_owner, p_game, p_state, p_updated)
    on conflict (owner, game) do update set state = excluded.state, updated_ms = excluded.updated_ms, saved_at = now()
    where public.game_saves.updated_ms <= excluded.updated_ms;
  select updated_ms into v_now from public.game_saves where owner = v_owner and game = p_game;
  return jsonb_build_object('account', true, 'updated_ms', v_now);
end $$;

revoke execute on function public.game_save_owner() from public, anon;
revoke execute on function public.game_save_get(text) from public, anon;
revoke execute on function public.game_save_put(text, text, bigint) from public, anon;
grant  execute on function public.game_save_owner() to authenticated;
grant  execute on function public.game_save_get(text) to authenticated;
grant  execute on function public.game_save_put(text, text, bigint) to authenticated;

-- ---------- 2. DELETE YOUR OWN MEME PHOTOS FROM ANY DEVICE ----------
-- before: only the exact phone that uploaded a photo could remove the file
drop policy if exists reactions_remove_mine on storage.objects;
create policy reactions_remove_mine on storage.objects for delete to authenticated
  using (bucket_id = 'reactions' and exists (
    select 1 from public.reaction_images r
    where r.path = storage.objects.name and r.member_id = public.my_member_id()));

-- ---------- 3. LIMIT FAMILY-CODE GUESSES ----------
create table if not exists private.code_attempts (
  auth_uid   uuid primary key,
  fails      int  not null default 0,
  first_fail timestamptz not null default now()
);

create or replace function private.code_locked() returns boolean
language sql stable as $$
  select exists (select 1 from private.code_attempts
                 where auth_uid = auth.uid() and fails >= 10 and first_fail > now() - interval '15 minutes')
$$;

create or replace function private.code_failed() returns void
language plpgsql as $$
begin
  insert into private.code_attempts as ca (auth_uid, fails, first_fail) values (auth.uid(), 1, now())
  on conflict (auth_uid) do update set
    fails      = case when ca.first_fail < now() - interval '15 minutes' then 1 else ca.fails + 1 end,
    first_fail = case when ca.first_fail < now() - interval '15 minutes' then now() else ca.first_fail end;
end $$;

-- join: a wrong code now RETURNS null instead of raising, so the miss is counted
-- (raising would undo the counter). The page shows "That's not the family code."
create or replace function public.join_village(
  p_code text, p_name text, p_pin text, p_avatar text, p_is_honey boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_first boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if private.code_locked() then raise exception 'Too many wrong family codes. Try again in 15 minutes.'; end if;
  if not exists (select 1 from private.family_secret
                 where code_hash = extensions.crypt(lower(trim(p_code)), code_hash)) then
    perform private.code_failed();
    return null;
  end if;
  if p_pin !~ '^[0-9]{4}$' then raise exception 'PIN must be exactly 4 digits'; end if;
  if exists (select 1 from public.members where lower(trim(display_name)) = lower(trim(p_name))) then
    raise exception 'That name is already in the village. Log in instead!';
  end if;
  v_first := not exists (select 1 from public.members);
  insert into public.members (display_name, avatar, is_honey, is_admin)
    values (trim(p_name), coalesce(nullif(trim(p_avatar), ''), '🙂'), false, v_first)
    returning id into v_id;
  insert into private.member_pins (member_id, pin_hash)
    values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  insert into public.member_devices (auth_uid, member_id) values (auth.uid(), v_id)
    on conflict (auth_uid) do update set member_id = excluded.member_id, linked_at = now();
  return v_id;
end $$;

-- returns: ok | bad_code | code_locked | no_member | bad_pin | locked | not_signed_in
create or replace function public.login_village(p_code text, p_name text, p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_pin private.member_pins%rowtype;
begin
  if auth.uid() is null then return 'not_signed_in'; end if;
  if private.code_locked() then return 'code_locked'; end if;
  if not exists (select 1 from private.family_secret
                 where code_hash = extensions.crypt(lower(trim(p_code)), code_hash)) then
    perform private.code_failed();
    return 'bad_code';
  end if;
  select id into v_member from public.members where lower(trim(display_name)) = lower(trim(p_name));
  if v_member is null then return 'no_member'; end if;
  select * into v_pin from private.member_pins where member_id = v_member for update;
  if v_pin.locked_until is not null and v_pin.locked_until > now() then return 'locked'; end if;
  if v_pin.pin_hash <> extensions.crypt(p_pin, v_pin.pin_hash) then
    update private.member_pins set
      failed_attempts = case when failed_attempts + 1 >= 5 then 0 else failed_attempts + 1 end,
      locked_until    = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
    where member_id = v_member;
    return 'bad_pin';
  end if;
  update private.member_pins set failed_attempts = 0, locked_until = null where member_id = v_member;
  insert into public.member_devices (auth_uid, member_id) values (auth.uid(), v_member)
    on conflict (auth_uid) do update set member_id = excluded.member_id, linked_at = now();
  return 'ok';
end $$;

revoke execute on function public.join_village(text, text, text, text, boolean) from public, anon;
grant  execute on function public.join_village(text, text, text, text, boolean) to authenticated;
revoke execute on function public.login_village(text, text, text) from public, anon;
grant  execute on function public.login_village(text, text, text) to authenticated;
