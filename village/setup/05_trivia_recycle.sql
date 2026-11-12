-- =====================================================================
--  THE FAMILY VILLAGE: step 5, trivia never runs out + admin heads-up
--  Run ONCE in Supabase SQL Editor (after 04).
-- =====================================================================

-- today's question: unplayed first; if the vault is empty, re-run a "throwback"
-- (a fresh copy of the question played longest ago, never one from the last 60 days)
create or replace function public.todays_trivia() returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_q public.trivia_questions%rowtype; v_old public.trivia_questions%rowtype;
        v_today date := public.village_today();
        v_mine public.trivia_answers%rowtype; v_answer int; v_throwback boolean := false;
begin
  if not public.is_member() then raise exception 'Members only'; end if;
  perform pg_advisory_xact_lock(424242);
  select * into v_q from public.trivia_questions where play_date = v_today;
  if not found then
    select * into v_q from public.trivia_questions
      where play_date is null
      order by (category = 'family' and extract(doy from v_today)::int % 2 = 0) desc, random()
      limit 1;
    if found then
      update public.trivia_questions set play_date = v_today where id = v_q.id;
    else
      -- vault is empty: recycle the question whose last play is oldest
      select q.* into v_old from public.trivia_questions q
        where q.play_date is not null
          and not exists (select 1 from public.trivia_questions q2
                          where q2.question = q.question and q2.play_date > v_today - 60)
        order by (select max(q3.play_date) from public.trivia_questions q3 where q3.question = q.question), random()
        limit 1;
      if not found then
        select * into v_old from public.trivia_questions where play_date is not null order by play_date limit 1;
      end if;
      if not found then return null; end if;
      insert into public.trivia_questions (question, choices, category, submitted_by, play_date)
        values (v_old.question, v_old.choices, v_old.category, v_old.submitted_by, v_today)
        returning * into v_q;
      insert into private.trivia_keys (question_id, answer_index)
        select v_q.id, answer_index from private.trivia_keys where question_id = v_old.id;
    end if;
  end if;
  v_throwback := exists (select 1 from public.trivia_questions
                         where question = v_q.question and play_date < v_q.play_date);
  select * into v_mine from public.trivia_answers where question_id = v_q.id and member_id = public.my_member_id();
  if found then select answer_index into v_answer from private.trivia_keys where question_id = v_q.id; end if;
  return jsonb_build_object(
    'id', v_q.id, 'question', v_q.question, 'choices', v_q.choices, 'category', v_q.category,
    'submitted_by', v_q.submitted_by, 'play_date', v_today, 'throwback', v_throwback,
    'my_choice', v_mine.choice, 'answer_index', v_answer);
end $$;

-- admin heads-up: how full is the vault?
create or replace function public.trivia_vault_status() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'unplayed', (select count(*) from public.trivia_questions where play_date is null),
    'family_unplayed', (select count(*) from public.trivia_questions where play_date is null and category = 'family'),
    'played', (select count(*) from public.trivia_questions where play_date is not null));
end $$;

revoke execute on function public.todays_trivia() from public, anon;
grant  execute on function public.todays_trivia() to authenticated;
revoke execute on function public.trivia_vault_status() from public, anon;
grant  execute on function public.trivia_vault_status() to authenticated;
