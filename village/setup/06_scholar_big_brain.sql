-- THE FAMILY VILLAGE: step 6, Scholar League is for every student, not just pre-meds
update public.award_categories
   set name = 'Big Brain', emoji = '🧠', metric = 'trivia_correct'
 where name = 'Science Brain' and league = 'scholar';
