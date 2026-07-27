-- Migration: restore v_teacher_lesson_trends (drift heal)
-- ============================================================================
-- Date: 2026-07-27. The view exists in the cloud baseline
-- (supabase/baseline/cloud_schema_2026-06-22.sql:4519, security_invoker) and
-- is read by app/api/teachers/performance/route.ts, but was absent from the
-- StudentDevelopment stack entirely — caught by core-tables.rls.test.ts
-- during the identity-repair verification. Definition verbatim from the
-- baseline. security_invoker keeps RLS enforcement on the underlying tables
-- (a student resolves only their own non-teacher profile → zero rows).
-- Grants: SELECT for authenticated/service_role only — the baseline's
-- GRANT ALL ... TO anon is not carried forward (no anon surface reads it).
-- ============================================================================

DROP VIEW IF EXISTS public.v_teacher_lesson_trends;

CREATE VIEW public.v_teacher_lesson_trends WITH (security_invoker='true') AS
 SELECT p.id AS teacher_id,
    date_trunc('month'::text, l.scheduled_at) AS month,
    count(*) FILTER (WHERE (l.status = 'COMPLETED'::public.lesson_status)) AS completed,
    count(*) FILTER (WHERE (l.status = 'CANCELLED'::public.lesson_status)) AS cancelled,
    count(*) FILTER (WHERE (l.status = 'SCHEDULED'::public.lesson_status)) AS scheduled,
    count(*) AS total
   FROM (public.profiles p
     LEFT JOIN public.lessons l ON (((l.teacher_id = p.id) AND (l.deleted_at IS NULL) AND (l.scheduled_at >= date_trunc('month'::text, (now() - '1 year'::interval))) AND (l.scheduled_at < date_trunc('month'::text, (now() + '1 mon'::interval))))))
  WHERE ((p.is_teacher OR p.is_admin) AND (p.is_active = true))
  GROUP BY p.id, (date_trunc('month'::text, l.scheduled_at))
  ORDER BY p.id, (date_trunc('month'::text, l.scheduled_at)) DESC;

COMMENT ON VIEW public.v_teacher_lesson_trends IS 'Monthly lesson trends per teacher for the last 12 months';

GRANT SELECT ON public.v_teacher_lesson_trends TO authenticated, service_role;
