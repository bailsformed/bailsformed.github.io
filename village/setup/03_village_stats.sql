-- =====================================================================
--  THE FAMILY VILLAGE: step 3, Village Stats (admin-only traffic)
--  Run ONCE in Supabase SQL Editor.
-- =====================================================================

-- one row each time someone opens a tab (same tab within 2 min = one visit)
create table public.page_events (
  id        bigint generated always as identity primary key,
  member_id uuid not null references public.members(id) on delete cascade,
  tab       text not null check (char_length(tab) <= 20),
  at        timestamptz not null default now()
);
create index page_events_at_idx on public.page_events (at);
create index page_events_member_idx on public.page_events (member_id, at);
alter table public.page_events enable row level security;
-- no read/write policies: only the functions below can touch it

create or replace function public.log_visit(p_tab text) returns void
language plpgsql security definer set search_path = public as $$
declare v_member uuid := public.my_member_id();
begin
  if v_member is null then return; end if;
  if exists (select 1 from public.page_events
             where member_id = v_member and tab = left(p_tab, 20) and at > now() - interval '2 minutes') then
    return;
  end if;
  insert into public.page_events (member_id, tab) values (v_member, left(p_tab, 20));
end $$;

create or replace function public.admin_traffic(p_days int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_today date := public.village_today(); v_from date; v_out jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  v_from := v_today - (greatest(1, least(p_days, 365)) - 1);
  with ev as (
    select member_id, tab, at, (at at time zone 'America/Chicago') as lt,
           (at at time zone 'America/Chicago')::date as d
    from public.page_events
  ), rng as (select * from ev where d >= v_from),
  days as (select distinct member_id, d from ev),
  runs as (
    select member_id, max(d) as e, count(*)::int as len
    from (select member_id, d, d - (row_number() over (partition by member_id order by d))::int as g from days) x
    group by member_id, g
  )
  select jsonb_build_object(
    'from', v_from, 'to', v_today,
    'residents', (select count(*) from public.members),
    'today', (select count(distinct member_id) from ev where d = v_today),
    'week', (select count(distinct member_id) from ev where d > v_today - 7),
    'visits', (select count(*) from rng),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', g.d, 'people', coalesce(c.people, 0), 'visits', coalesce(c.visits, 0)) order by g.d), '[]')
              from generate_series(v_from, v_today, interval '1 day') as g(d)
              left join (select d, count(distinct member_id) as people, count(*) as visits from rng group by d) c on c.d = g.d::date),
    'tabs', (select coalesce(jsonb_object_agg(tab, n), '{}') from (select tab, count(*) as n from rng group by tab) t),
    'hours', (select jsonb_agg(coalesce(h.n, 0) order by gs.hr)
              from generate_series(0, 23) gs(hr)
              left join (select extract(hour from lt)::int as hr, count(*) as n from rng group by 1) h on h.hr = gs.hr),
    'members', (select coalesce(jsonb_agg(jsonb_build_object(
                  'id', m.id,
                  'last_seen', (select max(at) from ev where ev.member_id = m.id),
                  'days', (select count(distinct d) from rng where rng.member_id = m.id),
                  'visits', (select count(*) from rng where rng.member_id = m.id),
                  'streak', coalesce((select r.len from runs r where r.member_id = m.id and r.e >= v_today - 1 order by r.e desc limit 1), 0),
                  'fav', (select tab from rng where rng.member_id = m.id group by tab order by count(*) desc limit 1)
                )), '[]') from public.members m)
  ) into v_out;
  return v_out;
end $$;

revoke execute on function public.log_visit(text) from public, anon;
grant  execute on function public.log_visit(text) to authenticated;
revoke execute on function public.admin_traffic(int) from public, anon;
grant  execute on function public.admin_traffic(int) to authenticated;
