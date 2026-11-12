-- =====================================================================
--  THE POT: Bailey & PB's shared money + calendar
--  Run this ONCE in Supabase: SQL Editor → New query → paste → Run.
--  It lives in the same project as the Family Village, but the village
--  can NEVER read it: every table only opens for the 2 people in the pot,
--  and only for real email logins (not the village's PIN devices).
--  Safe to keep in a public repo: it contains no passwords or codes.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- ---------------------------------------------------------------------
--  1. THE HOUSEHOLD (max 2 people)
-- ---------------------------------------------------------------------
create table public.pot_households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'The Pot' check (char_length(name) <= 40),
  gcal_id     text,                       -- the joint Google Calendar's id
  gclient_id  text,                       -- your Google OAuth client id (public, not a secret)
  created_at  timestamptz not null default now()
);

create table private.pot_invites (
  household_id uuid primary key references public.pot_households(id) on delete cascade,
  code_hash    text not null,
  failed       int  not null default 0
);

create table public.pot_members (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  household_id uuid not null references public.pot_households(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 30),
  theme        text not null default 'apothecary' check (theme in ('apothecary','dungeon')),
  emoji        text not null default '🌙' check (char_length(emoji) <= 8),
  joined_at    timestamptz not null default now()
);

-- helpers ----------------------------------------------------------------
create or replace function public.pot_is_real_login() returns boolean
language sql stable as $$
  select auth.uid() is not null and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

create or replace function public.pot_my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from public.pot_members
  where user_id = auth.uid() and public.pot_is_real_login()
$$;

-- create a pot: returns the invite code ONCE (only its hash is stored)
create or replace function public.pot_create(p_name text, p_display text, p_theme text, p_emoji text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare h uuid; code text;
begin
  if not public.pot_is_real_login() then raise exception 'Please sign in with email first.'; end if;
  if exists (select 1 from pot_members where user_id = auth.uid()) then raise exception 'You are already in a pot.'; end if;
  insert into pot_households(name) values (coalesce(nullif(trim(p_name),''),'The Pot')) returning id into h;
  insert into pot_members(user_id, household_id, display_name, theme, emoji)
    values (auth.uid(), h, trim(p_display), coalesce(p_theme,'apothecary'), coalesce(p_emoji,'🌙'));
  code := upper(substr(translate(encode(gen_random_bytes(9),'base64'),'+/=0OIl1','XYZ23456'),1,8));
  insert into private.pot_invites(household_id, code_hash) values (h, crypt(code, gen_salt('bf')));
  return code;
end $$;

-- join with the code (second person only; 10 wrong tries locks the code)
create or replace function public.pot_join(p_code text, p_display text, p_theme text, p_emoji text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare r record;
begin
  if not public.pot_is_real_login() then raise exception 'Please sign in with email first.'; end if;
  if exists (select 1 from pot_members where user_id = auth.uid()) then raise exception 'You are already in a pot.'; end if;
  for r in select * from private.pot_invites loop
    if r.failed < 10 and r.code_hash = crypt(upper(trim(p_code)), r.code_hash) then
      if (select count(*) from pot_members where household_id = r.household_id) >= 2 then
        raise exception 'This pot already has two people.';
      end if;
      insert into pot_members(user_id, household_id, display_name, theme, emoji)
        values (auth.uid(), r.household_id, trim(p_display), coalesce(p_theme,'dungeon'), coalesce(p_emoji,'⚔️'));
      return r.household_id;
    end if;
  end loop;
  update private.pot_invites set failed = failed + 1;   -- slows down guessing (kept: we return instead of raising)
  return null;                                          -- wrong code: the page says so
end $$;

-- make a fresh invite code (old one stops working)
create or replace function public.pot_new_code() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare h uuid := public.pot_my_household(); code text;
begin
  if h is null then raise exception 'Not in a pot.'; end if;
  code := upper(substr(translate(encode(gen_random_bytes(9),'base64'),'+/=0OIl1','XYZ23456'),1,8));
  insert into private.pot_invites(household_id, code_hash, failed) values (h, crypt(code, gen_salt('bf')), 0)
    on conflict (household_id) do update set code_hash = excluded.code_hash, failed = 0;
  return code;
end $$;

-- ---------------------------------------------------------------------
--  2. MONEY
-- ---------------------------------------------------------------------
create table public.pot_accounts (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.pot_my_household() references public.pot_households(id) on delete cascade,
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 40),
  kind         text not null default 'checking' check (kind in ('checking','savings','credit','cash')),
  balance      numeric(12,2) not null default 0,   -- for credit: amount OWED
  balance_date date not null default current_date,
  archived     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.pot_categories (
  household_id uuid not null default public.pot_my_household() references public.pot_households(id) on delete cascade,
  id           text not null check (id ~ '^[a-z0-9_]{1,30}$'),
  name         text not null check (char_length(name) between 1 and 50),
  tier         int  not null default 2 check (tier between 1 and 3),
  sort         int  not null default 100,
  primary key (household_id, id)
);

create table public.pot_budgets (
  household_id uuid not null default public.pot_my_household() references public.pot_households(id) on delete cascade,
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category     text not null,
  amount       numeric(12,2) not null default 0 check (amount >= 0),
  primary key (owner, category)
);

-- out_amt is from the ACCOUNT's point of view: positive = money left / was charged,
-- negative = money came in / refund / card payment received.
create table public.pot_tx (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.pot_my_household() references public.pot_households(id) on delete cascade,
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id   uuid references public.pot_accounts(id) on delete set null,
  date         date not null,
  out_amt      numeric(12,2) not null,
  type         text not null check (type in ('expense','income','transfer')),
  category     text,          -- expense category id
  source       text,          -- income source
  note         text check (char_length(note) <= 120),
  fp           text,          -- duplicate fingerprint from imports
  created_at   timestamptz not null default now()
);
create unique index pot_tx_fp on public.pot_tx (household_id, fp);   -- blank fp never collides
create index pot_tx_date on public.pot_tx (household_id, date);

create table public.pot_bills (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.pot_my_household() references public.pot_households(id) on delete cascade,
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 50),
  amount       numeric(12,2) not null default 0,
  kind         text not null default 'bill' check (kind in ('bill','subscription','oneoff')),
  due_day      int check (due_day between 1 and 31),     -- monthly bills & subscriptions
  due_date     date,                                      -- one-time (tuition, etc.)
  category     text,
  account_id   uuid references public.pot_accounts(id) on delete set null,
  autopay      boolean not null default false,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.pot_bill_paid (
  bill_id      uuid not null references public.pot_bills(id) on delete cascade,
  month        text not null check (month ~ '^\d{4}-\d{2}$'),
  household_id uuid not null default public.pot_my_household() references public.pot_households(id) on delete cascade,
  paid_by      uuid not null default auth.uid(),
  paid_at      timestamptz not null default now(),
  primary key (bill_id, month)
);

create table public.pot_rules (
  household_id uuid not null default public.pot_my_household() references public.pot_households(id) on delete cascade,
  owner        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant     text not null check (char_length(merchant) <= 60),
  value        text not null check (char_length(value) <= 60),
  primary key (owner, merchant)
);

create table public.pot_settings (
  household_id   uuid primary key default public.pot_my_household() references public.pot_households(id) on delete cascade,
  income_monthly numeric(12,2) not null default 0,
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  3. CALENDAR (class dates, deadlines; synced with Google)
-- ---------------------------------------------------------------------
create table public.pot_events (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null default public.pot_my_household() references public.pot_households(id) on delete cascade,
  owner        uuid default auth.uid() references auth.users(id) on delete set null,   -- whose deadline it is
  title        text not null check (char_length(title) between 1 and 120),
  date         date not null,
  start_time   time,
  end_time     time,
  course       text check (char_length(course) <= 40),
  kind         text not null default 'other' check (kind in ('exam','quiz','assignment','lab','reading','class','deadline','money','life','other')),
  notes        text check (char_length(notes) <= 500),
  done         boolean not null default false,
  done_at      timestamptz,
  gcal_id      text,
  created_at   timestamptz not null default now()
);
create index pot_events_date on public.pot_events (household_id, date);

-- ---------------------------------------------------------------------
--  4. PRIVACY: only the two of you, only with real logins
-- ---------------------------------------------------------------------
alter table public.pot_households enable row level security;
alter table public.pot_members    enable row level security;
alter table public.pot_accounts   enable row level security;
alter table public.pot_categories enable row level security;
alter table public.pot_budgets    enable row level security;
alter table public.pot_tx         enable row level security;
alter table public.pot_bills      enable row level security;
alter table public.pot_bill_paid  enable row level security;
alter table public.pot_rules      enable row level security;
alter table public.pot_settings   enable row level security;
alter table public.pot_events     enable row level security;

create policy pot_house_read   on public.pot_households for select to authenticated using (id = public.pot_my_household());
create policy pot_house_update on public.pot_households for update to authenticated using (id = public.pot_my_household()) with check (id = public.pot_my_household());
create policy pot_members_read on public.pot_members for select to authenticated using (household_id = public.pot_my_household());
create policy pot_members_me   on public.pot_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and household_id = public.pot_my_household());

do $$ declare t text; begin
  foreach t in array array['pot_accounts','pot_categories','pot_budgets','pot_tx','pot_bills','pot_bill_paid','pot_rules','pot_settings','pot_events'] loop
    execute format('create policy %1$s_all on public.%1$s for all to authenticated using (household_id = public.pot_my_household()) with check (household_id = public.pot_my_household())', t);
  end loop;
end $$;

-- anonymous village devices get nothing, even by accident
revoke all on all tables in schema private from anon, authenticated;
revoke all on public.pot_households, public.pot_members, public.pot_accounts, public.pot_categories, public.pot_budgets,
  public.pot_tx, public.pot_bills, public.pot_bill_paid, public.pot_rules, public.pot_settings, public.pot_events from anon;
revoke execute on function public.pot_create(text,text,text,text), public.pot_join(text,text,text,text), public.pot_new_code() from anon, public;
grant execute on function public.pot_create(text,text,text,text), public.pot_join(text,text,text,text), public.pot_new_code() to authenticated;
