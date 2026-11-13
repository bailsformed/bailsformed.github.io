-- =====================================================================
--  THE POT: step 3, count wrong invite codes per LOGIN, not per pot
--  Before: one wrong code added a strike to EVERY pot's invite code, so
--  anyone with an email login could type 10 wrong codes and lock them all.
--  Now: 10 wrong codes lock only that login, for 15 minutes.
--  Run ONCE in Supabase SQL Editor (after 02_pot_fixes.sql). Safe to run again.
-- =====================================================================
create table if not exists private.pot_join_attempts (
  user_id    uuid primary key,
  fails      int  not null default 0,
  first_fail timestamptz not null default now()
);

-- clear the old shared strikes so no real invite code stays locked
update private.pot_invites set failed = 0 where failed > 0;

create or replace function public.pot_join(p_code text, p_display text, p_theme text, p_emoji text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare r record;
begin
  if not public.pot_is_real_login() then raise exception 'Please sign in with email first.'; end if;
  if exists (select 1 from pot_members where user_id = auth.uid()) then raise exception 'You are already in a pot.'; end if;
  if exists (select 1 from private.pot_join_attempts
             where user_id = auth.uid() and fails >= 10 and first_fail > now() - interval '15 minutes') then
    raise exception 'Too many wrong codes. Try again in 15 minutes.';
  end if;
  for r in select * from private.pot_invites loop
    if r.code_hash = crypt(upper(trim(p_code)), r.code_hash) then
      if (select count(*) from pot_members where household_id = r.household_id) >= 2 then
        raise exception 'This pot already has two people.';
      end if;
      insert into pot_members(user_id, household_id, display_name, theme, emoji)
        values (auth.uid(), r.household_id, trim(p_display), coalesce(p_theme,'dungeon'), coalesce(p_emoji,'⚔️'));
      delete from private.pot_join_attempts where user_id = auth.uid();
      return r.household_id;
    end if;
  end loop;
  -- wrong code: one strike for THIS login only (we return instead of raising, so the strike is kept)
  insert into private.pot_join_attempts as a (user_id, fails, first_fail) values (auth.uid(), 1, now())
  on conflict (user_id) do update set
    fails      = case when a.first_fail < now() - interval '15 minutes' then 1 else a.fails + 1 end,
    first_fail = case when a.first_fail < now() - interval '15 minutes' then now() else a.first_fail end;
  return null;                                          -- the page says "That code did not match."
end $$;

revoke execute on function public.pot_join(text,text,text,text) from anon, public;
grant  execute on function public.pot_join(text,text,text,text) to authenticated;
