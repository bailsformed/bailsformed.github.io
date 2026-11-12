-- =====================================================================
--  THE FAMILY VILLAGE: step 4, statuses, invite links & leagues
--  Run ONCE in Supabase SQL Editor (after 03_village_stats.sql).
-- =====================================================================

-- ---------- new statuses & hour types ----------
alter table public.members add column is_elder boolean not null default false;   -- 🧓 Old Head
alter table public.wins add column hours_type text check (hours_type in ('study', 'work'));
update public.wins set hours_type = 'study' where minutes is not null or kind = 'checkin';

-- residents can only edit their look now; statuses are admin-only
revoke update on public.members from authenticated;
grant  update (avatar, color, journey) on public.members to authenticated;

-- ---------- reserved faces: 👑 = admins only, 🍯 = Honey only ----------
create or replace function private.reserved_faces() returns trigger
language plpgsql as $$
begin
  if new.avatar = '👑' and not new.is_admin then new.avatar := '🙂'; end if;
  if new.avatar = '🍯' and not new.is_honey then new.avatar := '🙂'; end if;
  return new;
end $$;
create trigger members_reserved_faces before insert or update on public.members
  for each row execute function private.reserved_faces();

-- ---------- joining no longer asks "are you Honey?" ----------
create or replace function public.join_village(
  p_code text, p_name text, p_pin text, p_avatar text, p_is_honey boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_first boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from private.family_secret
                 where code_hash = extensions.crypt(lower(trim(p_code)), code_hash)) then
    raise exception 'Wrong family code';
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

-- ---------- admin: statuses (adds Old Head) ----------
drop function public.admin_set_member(uuid, boolean, boolean, boolean);
create function public.admin_set_member(
  p_member uuid, p_is_honey boolean default null, p_is_scholar boolean default null,
  p_is_admin boolean default null, p_is_elder boolean default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_member = public.my_member_id() and p_is_admin = false then raise exception 'You cannot un-crown yourself'; end if;
  update public.members set
    is_honey   = coalesce(p_is_honey, is_honey),
    is_scholar = coalesce(p_is_scholar, is_scholar),
    is_admin   = coalesce(p_is_admin, is_admin),
    is_elder   = coalesce(p_is_elder, is_elder)
  where id = p_member;
end $$;

-- ---------- invite links ----------
alter table private.member_pins add column pin_set boolean not null default true;

create table private.invites (
  token_hash text primary key,
  member_id  uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at    timestamptz
);

create or replace function public.admin_create_resident(
  p_name text, p_avatar text, p_is_honey boolean, p_is_scholar boolean, p_is_elder boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if exists (select 1 from public.members where lower(trim(display_name)) = lower(trim(p_name))) then
    raise exception 'Someone named that already lives here';
  end if;
  insert into public.members (display_name, avatar, is_honey, is_scholar, is_elder)
    values (trim(p_name), coalesce(nullif(trim(p_avatar), ''), '🙂'),
            coalesce(p_is_honey, false), coalesce(p_is_scholar, false), coalesce(p_is_elder, false))
    returning id into v_id;
  -- unguessable placeholder PIN; they can set a real one later from their house
  insert into private.member_pins (member_id, pin_hash, pin_set)
    values (v_id, extensions.crypt(encode(extensions.gen_random_bytes(16), 'hex'), extensions.gen_salt('bf')), false);
  return v_id;
end $$;

create or replace function public.admin_make_invite(p_member uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_token text := encode(extensions.gen_random_bytes(18), 'hex');
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if not exists (select 1 from public.members where id = p_member) then raise exception 'No such resident'; end if;
  delete from private.invites where member_id = p_member and used_at is null;   -- one live link per person
  insert into private.invites (token_hash, member_id)
    values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_member);
  return v_token;
end $$;

-- returns: ok | bad | expired | used | not_signed_in
create or replace function public.redeem_invite(p_token text) returns text
language plpgsql security definer set search_path = public as $$
declare v_inv private.invites%rowtype;
begin
  if auth.uid() is null then return 'not_signed_in'; end if;
  select * into v_inv from private.invites
    where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') for update;
  if not found then return 'bad'; end if;
  if v_inv.used_at is not null then return 'used'; end if;
  if v_inv.expires_at < now() then return 'expired'; end if;
  update private.invites set used_at = now() where token_hash = v_inv.token_hash;
  insert into public.member_devices (auth_uid, member_id) values (auth.uid(), v_inv.member_id)
    on conflict (auth_uid) do update set member_id = excluded.member_id, linked_at = now();
  return 'ok';
end $$;

create or replace function public.my_pin_is_set() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select pin_set from private.member_pins where member_id = public.my_member_id()), true)
$$;

create or replace function public.change_my_pin(p_old text, p_new text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_member uuid := public.my_member_id(); v_pin private.member_pins%rowtype;
begin
  if v_member is null or p_new !~ '^[0-9]{4}$' then return false; end if;
  select * into v_pin from private.member_pins where member_id = v_member;
  if v_pin.pin_set and v_pin.pin_hash <> extensions.crypt(coalesce(p_old, ''), v_pin.pin_hash) then return false; end if;
  update private.member_pins set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf')), pin_set = true
    where member_id = v_member;
  return true;
end $$;

create or replace function public.admin_reset_pin(p_member uuid, p_new text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_new !~ '^[0-9]{4}$' then raise exception 'PIN must be exactly 4 digits'; end if;
  update private.member_pins set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf')),
    failed_attempts = 0, locked_until = null, pin_set = true where member_id = p_member;
end $$;

-- ---------- stats: study vs work hours, league streaks, science trivia ----------
drop function public.period_stats(date, date);
create function public.period_stats(p_from date, p_to date)
returns table (member_id uuid, wins int, checkins int, minutes int, roasts_given int,
               times_roasted int, reactions_received int, trivia_correct int, trivia_played int,
               wordle_avg numeric, wordle_played int, quotes_said int, best_streak int,
               study_minutes int, work_minutes int, study_streak int, work_streak int, science_correct int)
language sql stable security definer set search_path = public as $$
  with w as (
    select *, (created_at at time zone 'America/Chicago')::date as d from public.wins
    where (created_at at time zone 'America/Chicago')::date >= p_from
      and (created_at at time zone 'America/Chicago')::date <  p_to
  ), days as (
    select w.member_id, w.d from w
    union select g.member_id, g.played_on from public.game_scores g where g.played_on >= p_from and g.played_on < p_to
    union select a.member_id, (a.answered_at at time zone 'America/Chicago')::date from public.trivia_answers a
      where (a.answered_at at time zone 'America/Chicago')::date >= p_from
        and (a.answered_at at time zone 'America/Chicago')::date <  p_to
  ), typed as (select distinct w.member_id, w.hours_type, w.d from w where w.hours_type is not null),
  runs as (
    select x.member_id, x.kind, count(*)::int as len from (
      select days.member_id, 'all'::text as kind, days.d - (row_number() over (partition by days.member_id order by days.d))::int as g from days
      union all
      select t.member_id, t.hours_type, t.d - (row_number() over (partition by t.member_id, t.hours_type order by t.d))::int from typed t
    ) x group by x.member_id, x.kind, x.g
  )
  select m.id,
    (select count(*)::int from w where w.member_id = m.id and w.kind = 'win'),
    (select count(*)::int from w where w.member_id = m.id and w.kind = 'checkin'),
    (select coalesce(sum(w.minutes), 0)::int from w where w.member_id = m.id),
    (select count(*)::int from public.comments c
       where c.member_id = m.id
         and (c.created_at at time zone 'America/Chicago')::date >= p_from
         and (c.created_at at time zone 'America/Chicago')::date <  p_to),
    (select count(*)::int from public.comments c join w on w.id = c.win_id
       where w.member_id = m.id and c.member_id <> m.id),
    (select count(*)::int from public.win_emojis e join w on w.id = e.win_id
       where w.member_id = m.id and e.member_id <> m.id),
    (select count(*)::int from public.trivia_answers a join public.trivia_questions q on q.id = a.question_id
       where a.member_id = m.id and a.correct and q.play_date >= p_from and q.play_date < p_to),
    (select count(*)::int from public.trivia_answers a join public.trivia_questions q on q.id = a.question_id
       where a.member_id = m.id and q.play_date >= p_from and q.play_date < p_to),
    (select round(avg(g.score), 2) from public.game_scores g
       where g.member_id = m.id and g.game = 'wordle' and g.played_on >= p_from and g.played_on < p_to),
    (select count(*)::int from public.game_scores g
       where g.member_id = m.id and g.game = 'wordle' and g.played_on >= p_from and g.played_on < p_to),
    (select count(*)::int from public.quotes q
       where q.said_by_member = m.id and q.said_on >= p_from and q.said_on < p_to),
    coalesce((select max(r.len) from runs r where r.member_id = m.id and r.kind = 'all'), 0),
    (select coalesce(sum(w.minutes), 0)::int from w where w.member_id = m.id and w.hours_type = 'study'),
    (select coalesce(sum(w.minutes), 0)::int from w where w.member_id = m.id and w.hours_type = 'work'),
    coalesce((select max(r.len) from runs r where r.member_id = m.id and r.kind = 'study'), 0),
    coalesce((select max(r.len) from runs r where r.member_id = m.id and r.kind = 'work'), 0),
    (select count(*)::int from public.trivia_answers a join public.trivia_questions q on q.id = a.question_id
       where a.member_id = m.id and a.correct and q.category = 'science' and q.play_date >= p_from and q.play_date < p_to)
  from public.members m
  where public.is_member();
$$;

-- ---------- league awards ----------
alter table public.award_categories add column league text check (league in ('scholar', 'work'));
insert into public.award_categories (name, emoji, kind, period, metric, nominee_type, approved, proposed_by, league) values
  ('Scholar of the Month',  '📚', 'auto', 'month', 'study_minutes',   null, true, null, 'scholar'),
  ('Library Rat',           '🦉', 'auto', 'month', 'study_streak',    null, true, null, 'scholar'),
  ('Science Brain',         '🧪', 'auto', 'month', 'science_correct', null, true, null, 'scholar'),
  ('Valedictorian',         '🎓', 'auto', 'year',  'study_minutes',   null, true, null, 'scholar'),
  ('Workhorse of the Month','💼', 'auto', 'month', 'work_minutes',    null, true, null, 'work'),
  ('Never Clocks Out',      '⏰', 'auto', 'month', 'work_streak',     null, true, null, 'work'),
  ('Workhorse of the Year', '🏭', 'auto', 'year',  'work_minutes',    null, true, null, 'work');

-- ---------- permissions for the new/changed functions ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in (
             'join_village','admin_set_member','admin_create_resident','admin_make_invite',
             'redeem_invite','my_pin_is_set','change_my_pin','admin_reset_pin','period_stats')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;
