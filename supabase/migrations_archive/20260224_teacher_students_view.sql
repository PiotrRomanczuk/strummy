-- Teacher-students derived view
-- Provides scoped access: a teacher sees only students they have at least one lesson with.
-- Self-maintaining — always in sync with the lessons table, no triggers needed.

CREATE OR REPLACE VIEW teacher_students AS
SELECT DISTINCT
    teacher_id,
    student_id
FROM lessons
WHERE deleted_at IS NULL;

COMMENT ON VIEW teacher_students IS
  'Derived teacher-student pairs from lessons. A student appears here once they have at least one lesson with a teacher.';
