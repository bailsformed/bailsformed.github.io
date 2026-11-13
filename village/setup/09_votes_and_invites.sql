-- =====================================================================
--  THE FAMILY VILLAGE: step 9, tidy award votes + safer invite links
--  1. You can take back your own vote ("↩ take back my vote").
--  2. When a quote / meme / roast / W is deleted, votes for it in awards
--     that are still open (this month, this year) are removed too, so a
--     deleted item can't win and nobody's vote stays stuck on "(deleted)".
--     Results for months/years that are already over are left alone.
--  3. A one-time clean-up of open-period votes that already point at
--     deleted items.
--  4. invite_for_whom(): lets the page say who an invite link is for, so a
--     phone that already belongs to someone asks before switching.
--  Run ONCE in Supabase SQL Editor (after 08). Safe to run again.
-- =====================================================================

-- 1. a member may delete only their own vote
drop policy if exists votes_delete on public.award_votes;
create policy votes_delete on public.award_votes for delete to authenticated
  using (voter = public.my_member_id());

-- 2. remove open-period votes for an item when it is deleted
create or replace function private.drop_votes_for_deleted() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_type text := tg_argv[0];
  v_month text := to_char(public.village_today(), 'YYYY-MM');
  v_year  text := to_char(public.village_today(), 'YYYY');
begin
  delete from public.award_votes v
   using public.award_categories c
   where c.id = v.category_id
     and c.nominee_type = v_type
     and v.nominee_id = old.id::text
     and v.period_key in (v_month, v_year);
  return old;
end $$;
revoke all on function private.drop_votes_for_deleted() from public, anon, authenticated;

drop trigger if exists quotes_drop_votes on public.quotes;
create trigger quotes_drop_votes after delete on public.quotes
  for each row execute function private.drop_votes_for_deleted('quote');

drop trigger if exists memes_drop_votes on public.reaction_images;
create trigger memes_drop_votes after delete on public.reaction_images
  for each row execute function private.drop_votes_for_deleted('meme');

drop trigger if exists comments_drop_votes on public.comments;
create trigger comments_drop_votes after delete on public.comments
  for each row execute function private.drop_votes_for_deleted('comment');

drop trigger if exists wins_drop_votes on public.wins;
create trigger wins_drop_votes after delete on public.wins
  for each row execute function private.drop_votes_for_deleted('win');

-- 3. one-time clean-up for this month and this year
delete from public.award_votes v
 using public.award_categories c
 where c.id = v.category_id
   and v.period_key in (to_char(public.village_today(), 'YYYY-MM'), to_char(public.village_today(), 'YYYY'))
   and (
     (c.nominee_type = 'quote'   and not exists (select 1 from public.quotes          x where x.id::text = v.nominee_id)) or
     (c.nominee_type = 'meme'    and not exists (select 1 from public.reaction_images x where x.id::text = v.nominee_id)) or
     (c.nominee_type = 'comment' and not exists (select 1 from public.comments        x where x.id::text = v.nominee_id)) or
     (c.nominee_type = 'win'     and not exists (select 1 from public.wins            x where x.id::text = v.nominee_id))
   );

-- 4. who is this invite for? (only answers for a link that still works)
create or replace function public.invite_for_whom(p_token text) returns text
language sql stable security definer set search_path = public as $$
  select m.display_name from private.invites i join public.members m on m.id = i.member_id
   where i.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and i.used_at is null and i.expires_at >= now()
$$;
revoke execute on function public.invite_for_whom(text) from public, anon;
grant execute on function public.invite_for_whom(text) to authenticated;
