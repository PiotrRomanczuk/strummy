-- Adds an optional due date and goal text to student_repertoire, used by the
-- song detail page's "quick assign" widget when a teacher assigns a song as
-- homework to one or more students.

ALTER TABLE public.student_repertoire ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.student_repertoire ADD COLUMN IF NOT EXISTS goal_text text;

COMMENT ON COLUMN public.student_repertoire.due_date IS 'Optional target date set when a teacher assigns this song as homework.';
COMMENT ON COLUMN public.student_repertoire.goal_text IS 'Optional free-text goal set when a teacher assigns this song as homework (e.g. "Memorise intro").';
