-- =====================================================================
--  THE FAMILY VILLAGE — database setup
--  Run this ONCE in Supabase: SQL Editor → New query → paste → Run.
--  Safe to keep in a public repo: it contains no passwords or codes.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;   -- NOT exposed to the website API

-- ---------------------------------------------------------------------
--  1. PEOPLE
-- ---------------------------------------------------------------------
create table public.members (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(trim(display_name)) between 1 and 30),
  avatar       text not null default '🙂',
  color        text not null default '#c9a227',
  is_honey     boolean not null default false,   -- turns on the Not-Safe-For-Honey filter
  is_scholar   boolean not null default false,
  journey      text check (char_length(journey) <= 80),   -- e.g. "Pre-med @ Tulane"
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);
create unique index members_name_unique on public.members (lower(trim(display_name)));

create table private.member_pins (
  member_id       uuid primary key references public.members(id) on delete cascade,
  pin_hash        text not null,
  failed_attempts int  not null default 0,
  locked_until    timestamptz
);

create table private.family_secret (
  id        int primary key default 1 check (id = 1),
  code_hash text not null
);

-- each phone/laptop gets an invisible sign-in; this links it to a family member
create table public.member_devices (
  auth_uid  uuid primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  linked_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  2. HELPERS
-- ---------------------------------------------------------------------
create or replace function public.village_today() returns date
language sql stable as $$ select (now() at time zone 'America/Chicago')::date $$;

create or replace function public.my_member_id() returns uuid
language sql stable security definer set search_path = public as $$
  select member_id from public.member_devices where auth_uid = auth.uid()
$$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.member_devices where auth_uid = auth.uid())
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select m.is_admin from public.members m
                   join public.member_devices d on d.member_id = m.id
                   where d.auth_uid = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
--  3. JOINING & LOGGING IN  (family code + name + 4-digit PIN)
-- ---------------------------------------------------------------------
create or replace function public.join_village(
  p_code text, p_name text, p_pin text, p_avatar text, p_is_honey boolean)
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
  v_first := not exists (select 1 from public.members);   -- first person in = admin
  insert into public.members (display_name, avatar, is_honey, is_admin)
    values (trim(p_name), coalesce(nullif(trim(p_avatar), ''), '🙂'), coalesce(p_is_honey, false), v_first)
    returning id into v_id;
  insert into private.member_pins (member_id, pin_hash)
    values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  insert into public.member_devices (auth_uid, member_id) values (auth.uid(), v_id)
    on conflict (auth_uid) do update set member_id = excluded.member_id, linked_at = now();
  return v_id;
end $$;

-- returns: ok | bad_code | no_member | bad_pin | locked | not_signed_in
create or replace function public.login_village(p_code text, p_name text, p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare v_member uuid; v_pin private.member_pins%rowtype;
begin
  if auth.uid() is null then return 'not_signed_in'; end if;
  if not exists (select 1 from private.family_secret
                 where code_hash = extensions.crypt(lower(trim(p_code)), code_hash)) then
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

create or replace function public.logout_village() returns void
language sql security definer set search_path = public as $$
  delete from public.member_devices where auth_uid = auth.uid()
$$;

create or replace function public.change_my_pin(p_old text, p_new text) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_member uuid := public.my_member_id(); v_hash text;
begin
  if v_member is null or p_new !~ '^[0-9]{4}$' then return false; end if;
  select pin_hash into v_hash from private.member_pins where member_id = v_member;
  if v_hash <> extensions.crypt(p_old, v_hash) then return false; end if;
  update private.member_pins set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf'))
    where member_id = v_member;
  return true;
end $$;

-- admin tools
create or replace function public.admin_set_member(
  p_member uuid, p_is_honey boolean, p_is_scholar boolean, p_is_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  update public.members set
    is_honey   = coalesce(p_is_honey, is_honey),
    is_scholar = coalesce(p_is_scholar, is_scholar),
    is_admin   = coalesce(p_is_admin, is_admin)
  where id = p_member;
end $$;

create or replace function public.admin_reset_pin(p_member uuid, p_new text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_new !~ '^[0-9]{4}$' then raise exception 'PIN must be exactly 4 digits'; end if;
  update private.member_pins set pin_hash = extensions.crypt(p_new, extensions.gen_salt('bf')),
    failed_attempts = 0, locked_until = null where member_id = p_member;
end $$;

-- ---------------------------------------------------------------------
--  4. THE GOOD STUFF
-- ---------------------------------------------------------------------
-- photo reaction library (family memes)
create table public.reaction_images (
  id         bigint generated always as identity primary key,
  member_id  uuid not null default public.my_member_id() references public.members(id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  path       text not null,           -- file path inside the 'reactions' storage bucket
  nsfh       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Ws and check-ins
create table public.wins (
  id         bigint generated always as identity primary key,
  member_id  uuid not null default public.my_member_id() references public.members(id) on delete cascade,
  kind       text not null default 'win' check (kind in ('win', 'checkin')),
  body       text not null check (char_length(body) between 1 and 500),
  minutes    int check (minutes between 0 and 1440),
  nsfh       boolean not null default false,
  created_at timestamptz not null default now()
);

-- roasts (comments) on Ws — text and/or a photo reaction
create table public.comments (
  id                bigint generated always as identity primary key,
  win_id            bigint not null references public.wins(id) on delete cascade,
  member_id         uuid not null default public.my_member_id() references public.members(id) on delete cascade,
  body              text check (char_length(body) <= 300),
  reaction_image_id bigint references public.reaction_images(id) on delete set null,
  nsfh              boolean not null default false,
  created_at        timestamptz not null default now(),
  check (body is not null or reaction_image_id is not null)
);

-- quick emoji reactions on Ws (🙄 🤡 👑 🧢 "who asked")
create table public.win_emojis (
  win_id    bigint not null references public.wins(id) on delete cascade,
  member_id uuid not null default public.my_member_id() references public.members(id) on delete cascade,
  emoji     text not null check (char_length(emoji) <= 16),
  created_at timestamptz not null default now(),
  primary key (win_id, member_id, emoji)
);

-- the Quotes Wall
create table public.quotes (
  id                bigint generated always as identity primary key,
  body              text not null check (char_length(body) between 1 and 400),
  said_by           text not null check (char_length(said_by) between 1 and 40),
  said_by_member    uuid references public.members(id) on delete set null,
  context           text check (char_length(context) <= 200),
  said_on           date not null default public.village_today(),
  submitted_by      uuid default public.my_member_id() references public.members(id) on delete set null,
  source_comment_id bigint references public.comments(id) on delete set null,
  nsfh              boolean not null default false,
  created_at        timestamptz not null default now()
);

-- the Kitchen Table (general chat)
create table public.kitchen_messages (
  id                bigint generated always as identity primary key,
  member_id         uuid not null default public.my_member_id() references public.members(id) on delete cascade,
  body              text check (char_length(body) <= 1000),
  reaction_image_id bigint references public.reaction_images(id) on delete set null,
  nsfh              boolean not null default false,
  created_at        timestamptz not null default now(),
  check (body is not null or reaction_image_id is not null)
);

-- Wordle & friends
create table public.game_scores (
  id         bigint generated always as identity primary key,
  member_id  uuid not null default public.my_member_id() references public.members(id) on delete cascade,
  game       text not null check (game in ('wordle', 'connections', 'strands', 'mini')),
  puzzle     text not null,
  score      numeric not null,  -- wordle: guesses (7 = fail) · connections: mistakes (4 = fail) · strands: hints · mini: seconds
  raw        text check (char_length(raw) <= 600),
  played_on  date not null default public.village_today(),
  created_at timestamptz not null default now(),
  unique (member_id, game, puzzle)
);

-- the secret 🫶 — the sender is never stored
create table public.secret_love (
  id         bigint generated always as identity primary key,
  to_member  uuid not null references public.members(id) on delete cascade,
  seen       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  5. DAILY TRIVIA  (answers are hidden in the private schema)
-- ---------------------------------------------------------------------
create table public.trivia_questions (
  id           bigint generated always as identity primary key,
  question     text not null check (char_length(question) between 5 and 300),
  choices      jsonb not null check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) between 2 and 4),
  category     text not null default 'science' check (category in ('science', 'family', 'general')),
  submitted_by uuid references public.members(id) on delete set null,
  play_date    date unique,
  created_at   timestamptz not null default now()
);

create table private.trivia_keys (
  question_id  bigint primary key references public.trivia_questions(id) on delete cascade,
  answer_index int not null
);

create table public.trivia_answers (
  question_id bigint not null references public.trivia_questions(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  choice      int not null,
  correct     boolean not null,
  answered_at timestamptz not null default now(),
  primary key (question_id, member_id)
);

create or replace function public.has_answered(p_question bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trivia_answers
                 where question_id = p_question and member_id = public.my_member_id())
$$;

create or replace function public.add_trivia(
  p_question text, p_choices jsonb, p_answer int, p_category text)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  if p_answer < 0 or p_answer >= jsonb_array_length(p_choices) then raise exception 'Bad answer index'; end if;
  insert into public.trivia_questions (question, choices, category, submitted_by)
    values (p_question, p_choices, coalesce(p_category, 'family'), public.my_member_id())
    returning id into v_id;
  insert into private.trivia_keys values (v_id, p_answer);
  return v_id;
end $$;

-- picks today's question the first time anyone opens trivia that day
create or replace function public.todays_trivia() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_q public.trivia_questions%rowtype; v_today date := public.village_today();
        v_mine public.trivia_answers%rowtype; v_answer int;
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  perform pg_advisory_xact_lock(424242);
  select * into v_q from public.trivia_questions where play_date = v_today;
  if not found then
    -- alternate: family lore on even days when available, otherwise anything unplayed
    select * into v_q from public.trivia_questions
      where play_date is null
      order by (category = 'family' and extract(doy from v_today)::int % 2 = 0) desc, random()
      limit 1;
    if not found then return null; end if;
    update public.trivia_questions set play_date = v_today where id = v_q.id;
  end if;
  select * into v_mine from public.trivia_answers where question_id = v_q.id and member_id = public.my_member_id();
  if found then select answer_index into v_answer from private.trivia_keys where question_id = v_q.id; end if;
  return jsonb_build_object(
    'id', v_q.id, 'question', v_q.question, 'choices', v_q.choices, 'category', v_q.category,
    'submitted_by', v_q.submitted_by, 'play_date', v_today,
    'my_choice', v_mine.choice, 'answer_index', v_answer);
end $$;

create or replace function public.answer_trivia(p_question bigint, p_choice int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_answer int; v_date date;
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  select play_date into v_date from public.trivia_questions where id = p_question;
  if v_date is distinct from public.village_today() then raise exception 'That is not today''s question'; end if;
  select answer_index into v_answer from private.trivia_keys where question_id = p_question;
  insert into public.trivia_answers (question_id, member_id, choice, correct)
    values (p_question, public.my_member_id(), p_choice, p_choice = v_answer)
    on conflict do nothing;
  return jsonb_build_object('correct', p_choice = v_answer, 'answer_index', v_answer);
end $$;

-- ---------------------------------------------------------------------
--  6. SMALL ACTIONS
-- ---------------------------------------------------------------------
-- "🍯 Honey-proof this" — anyone can flag anything
create or replace function public.honey_proof(p_kind text, p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  case p_kind
    when 'win'     then update public.wins             set nsfh = true where id = p_id;
    when 'comment' then update public.comments         set nsfh = true where id = p_id;
    when 'quote'   then update public.quotes           set nsfh = true where id = p_id;
    when 'kitchen' then update public.kitchen_messages set nsfh = true where id = p_id;
    when 'meme'    then update public.reaction_images  set nsfh = true where id = p_id;
    else raise exception 'Unknown kind';
  end case;
end $$;

create or replace function public.send_love(p_to uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  if p_to = public.my_member_id() then raise exception 'Nice try'; end if;
  insert into public.secret_love (to_member) values (p_to);
end $$;

create or replace function public.village_love_total() returns int
language sql stable security definer set search_path = public as $$
  select case when public.is_member() then (select count(*)::int from public.secret_love) else 0 end
$$;

-- ---------------------------------------------------------------------
--  7. STATS, STREAKS & AWARDS
-- ---------------------------------------------------------------------
create or replace function public.member_streaks()
returns table (member_id uuid, current_streak int, best_streak int, last_active date)
language sql stable security definer set search_path = public as $$
  with days as (
    select w.member_id, (w.created_at at time zone 'America/Chicago')::date as d from public.wins w
    union select g.member_id, g.played_on from public.game_scores g
    union select a.member_id, (a.answered_at at time zone 'America/Chicago')::date from public.trivia_answers a
  ), grp as (
    select days.member_id, d, d - (row_number() over (partition by days.member_id order by d))::int as g from days
  ), runs as (
    select grp.member_id, max(d) as e, count(*)::int as len from grp group by grp.member_id, g
  )
  select m.id,
    coalesce((select r.len from runs r where r.member_id = m.id and r.e >= public.village_today() - 1
              order by r.e desc limit 1), 0),
    coalesce((select max(r.len) from runs r where r.member_id = m.id), 0),
    (select max(r.e) from runs r where r.member_id = m.id)
  from public.members m
  where public.is_member();
$$;

-- p_from inclusive, p_to exclusive (Chicago-time dates)
create or replace function public.period_stats(p_from date, p_to date)
returns table (member_id uuid, wins int, checkins int, minutes int, roasts_given int,
               times_roasted int, reactions_received int, trivia_correct int, trivia_played int,
               wordle_avg numeric, wordle_played int, quotes_said int, best_streak int)
language sql stable security definer set search_path = public as $$
  with w as (
    select * from public.wins
    where (created_at at time zone 'America/Chicago')::date >= p_from
      and (created_at at time zone 'America/Chicago')::date <  p_to
  ), days as (
    select w.member_id, (w.created_at at time zone 'America/Chicago')::date as d from w
    union select g.member_id, g.played_on from public.game_scores g where g.played_on >= p_from and g.played_on < p_to
    union select a.member_id, (a.answered_at at time zone 'America/Chicago')::date from public.trivia_answers a
      where (a.answered_at at time zone 'America/Chicago')::date >= p_from
        and (a.answered_at at time zone 'America/Chicago')::date <  p_to
  ), runs as (
    select days.member_id, count(*)::int as len
    from (select days.member_id, d - (row_number() over (partition by days.member_id order by d))::int as g from days) days
    group by days.member_id, g
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
    coalesce((select max(r.len) from runs r where r.member_id = m.id), 0)
  from public.members m
  where public.is_member();
$$;

create table public.award_categories (
  id            bigint generated always as identity primary key,
  name          text not null check (char_length(name) between 1 and 60),
  emoji         text not null default '🏆',
  kind          text not null check (kind in ('auto', 'vote')),
  period        text not null default 'month' check (period in ('month', 'year')),
  metric        text,          -- for auto awards: which period_stats column wins
  nominee_type  text check (nominee_type in ('member', 'quote', 'meme', 'comment', 'win')),
  proposed_by   uuid default public.my_member_id() references public.members(id) on delete set null,
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- family members "second" a proposed category; 3 seconds = it's official
create table public.category_seconds (
  category_id bigint not null references public.award_categories(id) on delete cascade,
  member_id   uuid not null default public.my_member_id() references public.members(id) on delete cascade,
  primary key (category_id, member_id)
);

create or replace function public.second_category(p_category bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  insert into public.category_seconds (category_id, member_id) values (p_category, public.my_member_id())
    on conflict do nothing;
  update public.award_categories set approved = true
    where id = p_category
      and (select count(*) from public.category_seconds where category_id = p_category) >= 3;
end $$;

-- secret ballots: you can only ever see your own vote
create table public.award_votes (
  category_id bigint not null references public.award_categories(id) on delete cascade,
  period_key  text not null check (period_key ~ '^[0-9]{4}(-[0-9]{2})?$'),   -- '2027-01' or '2027'
  voter       uuid not null default public.my_member_id() references public.members(id) on delete cascade,
  nominee_id  text not null,
  created_at  timestamptz not null default now(),
  primary key (category_id, period_key, voter)
);

-- vote counts are only revealed once the month/year is over
create or replace function public.award_tally(p_period text)
returns table (category_id bigint, nominee_id text, votes int)
language plpgsql stable security definer set search_path = public as $$
declare v_now text;
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  v_now := case when length(p_period) = 7 then to_char(public.village_today(), 'YYYY-MM')
                else to_char(public.village_today(), 'YYYY') end;
  if p_period >= v_now then raise exception 'No peeking — results unlock when the period ends'; end if;
  return query
    select v.category_id, v.nominee_id, count(*)::int
    from public.award_votes v where v.period_key = p_period
    group by v.category_id, v.nominee_id;
end $$;

-- starter award categories
insert into public.award_categories (name, emoji, kind, period, metric, nominee_type, approved, proposed_by) values
  ('Most Ws',            '🏆', 'auto', 'month', 'wins',               null,      true, null),
  ('Longest Streak',     '🔥', 'auto', 'month', 'best_streak',        null,      true, null),
  ('The Grinder',        '⏱️', 'auto', 'month', 'minutes',            null,      true, null),
  ('Trivia Champion',    '🧠', 'auto', 'month', 'trivia_correct',     null,      true, null),
  ('Wordle Wizard',      '🟩', 'auto', 'month', 'wordle_avg',         null,      true, null),
  ('Most Roasts Given',  '🗡️', 'auto', 'month', 'roasts_given',       null,      true, null),
  ('Most Roasted',       '🎯', 'auto', 'month', 'times_roasted',      null,      true, null),
  ('Crowd Favorite',     '💥', 'auto', 'month', 'reactions_received', null,      true, null),
  ('Quote of the Month', '💬', 'vote', 'month', null,                 'quote',   true, null),
  ('Meme of the Month',  '🖼️', 'vote', 'month', null,                 'meme',    true, null),
  ('Best Roast',         '🔪', 'vote', 'month', null,                 'comment', true, null),
  ('Biggest W',          '💪', 'vote', 'month', null,                 'win',     true, null),
  ('Most Dramatic',      '🎭', 'vote', 'month', null,                 'member',  true, null),
  ('Quote of the Year',  '👑', 'vote', 'year',  null,                 'quote',   true, null),
  ('Scholar of the Year','🎓', 'vote', 'year',  null,                 'member',  true, null),
  ('MVP of the Year',    '🏅', 'auto', 'year',  'wins',               null,      true, null),
  ('Clown of the Year',  '🤡', 'vote', 'year',  null,                 'member',  true, null);

-- ---------------------------------------------------------------------
--  8. SECURITY (Row Level Security): only signed-in family can see anything
-- ---------------------------------------------------------------------
alter table public.members          enable row level security;
alter table public.member_devices   enable row level security;
alter table public.reaction_images  enable row level security;
alter table public.wins             enable row level security;
alter table public.comments         enable row level security;
alter table public.win_emojis       enable row level security;
alter table public.quotes           enable row level security;
alter table public.kitchen_messages enable row level security;
alter table public.game_scores      enable row level security;
alter table public.secret_love      enable row level security;
alter table public.trivia_questions enable row level security;
alter table public.trivia_answers   enable row level security;
alter table public.award_categories enable row level security;
alter table public.category_seconds enable row level security;
alter table public.award_votes      enable row level security;

-- members: everyone in the family can see everyone; you can edit your own look
create policy members_read   on public.members for select to authenticated using (public.is_member());
create policy members_update on public.members for update to authenticated
  using (id = public.my_member_id()) with check (id = public.my_member_id());
revoke update on public.members from anon, authenticated;
grant  update (avatar, color, journey, is_scholar) on public.members to authenticated;

create policy devices_read on public.member_devices for select to authenticated using (auth_uid = auth.uid());

-- the standard pattern: family reads all · you post as yourself · you (or an admin) delete
do $$
declare t text;
begin
  foreach t in array array['reaction_images','wins','comments','win_emojis','kitchen_messages','game_scores']
  loop
    execute format('create policy %1$s_read   on public.%1$s for select to authenticated using (public.is_member())', t);
    execute format('create policy %1$s_insert on public.%1$s for insert to authenticated with check (member_id = public.my_member_id())', t);
    execute format('create policy %1$s_delete on public.%1$s for delete to authenticated using (member_id = public.my_member_id() or public.is_admin())', t);
  end loop;
end $$;

create policy quotes_read   on public.quotes for select to authenticated using (public.is_member());
create policy quotes_insert on public.quotes for insert to authenticated with check (submitted_by = public.my_member_id());
create policy quotes_delete on public.quotes for delete to authenticated
  using (submitted_by = public.my_member_id() or public.is_admin());

create policy love_read on public.secret_love for select to authenticated using (to_member = public.my_member_id());
create policy love_seen on public.secret_love for update to authenticated
  using (to_member = public.my_member_id()) with check (to_member = public.my_member_id());

-- trivia: you only see past/today's questions (or ones you wrote), and only see
-- other people's answers after you've answered yourself
create policy trivia_q_read on public.trivia_questions for select to authenticated
  using (public.is_member() and (play_date <= public.village_today() or submitted_by = public.my_member_id()));
create policy trivia_a_read on public.trivia_answers for select to authenticated
  using (public.is_member() and (member_id = public.my_member_id()
         or public.has_answered(question_id)
         or exists (select 1 from public.trivia_questions q where q.id = question_id and q.play_date < public.village_today())));

create policy cats_read    on public.award_categories for select to authenticated using (public.is_member());
create policy cats_propose on public.award_categories for insert to authenticated
  with check (proposed_by = public.my_member_id() and approved = false);
create policy cats_delete  on public.award_categories for delete to authenticated using (public.is_admin());
create policy seconds_read on public.category_seconds for select to authenticated using (public.is_member());

create policy votes_read   on public.award_votes for select to authenticated using (voter = public.my_member_id());
create policy votes_insert on public.award_votes for insert to authenticated with check (voter = public.my_member_id());
create policy votes_update on public.award_votes for update to authenticated
  using (voter = public.my_member_id()) with check (voter = public.my_member_id());

-- functions: only signed-in devices may call them
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in (
             'my_member_id','is_member','is_admin','join_village','login_village','logout_village',
             'change_my_pin','admin_set_member','admin_reset_pin','has_answered','add_trivia',
             'todays_trivia','answer_trivia','honey_proof','send_love','village_love_total',
             'member_streaks','period_stats','second_category','award_tally','village_today')
  loop
    execute format('revoke execute on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  9. PHOTO STORAGE for the meme library
--  (files get random names; only family members can upload)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reactions', 'reactions', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy reactions_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'reactions' and public.is_member());
create policy reactions_remove on storage.objects for delete to authenticated
  using (bucket_id = 'reactions' and (owner = auth.uid() or public.is_admin()));

-- =====================================================================
--  Done! Next: set your family code with 02_family_code.sql
-- =====================================================================
