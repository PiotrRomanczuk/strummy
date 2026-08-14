-- Move a handful of skills from the 'intermediate' curriculum tier to
-- 'beginner', per curriculum review 2026-08-14: barre chord (F major),
-- alternate picking, CAGED movable chord shapes, slides, and performing a
-- song from memory are all reachable earlier than 20260811090000 placed
-- them.
update public.skills set level = 'beginner' where name in (
  'Barre chord (F major)',
  'Alternate picking',
  'CAGED movable chord shapes',
  'Slides',
  'Performing a song from memory'
) and level = 'intermediate';
