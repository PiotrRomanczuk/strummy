# Strummy

Student-management context for guitar teachers: profiles, lessons, songs, assignments. One bounded context, one repo.

## Language

**Profile**:
The application-level user record on the `profiles` table. Extends a Supabase auth user with role flags, contact info, and onboarding state. Every authenticated user has exactly one Profile; the absence of a Profile for an authed user is a 403, not a 404.
_Avoid_: User (ambiguous with `auth.users`), Account.

**Role**:
A category of _what someone is in the product_. Exactly three: **Admin**, **Teacher**, **Student**. Stored as boolean columns (`is_admin`, `is_teacher`, `is_student`) on Profile, surfaced as a `roles` bag (`isAdmin | isTeacher | isStudent`) by the auth loader. A Profile may have more than one Role (a Teacher is often also an Admin).
_Avoid_: "permission," "user type."

**Flag**:
A boolean property on Profile that is **not** a Role. Currently: `isParent`, `isDevelopment`. Flags do not gate route access via `requiredRole`; they modify behavior (e.g. test-account guards skip mutations when `isDevelopment` is true). Kept separate from Role to avoid pretending all five booleans are interchangeable.
_Avoid_: treating Flags as Roles.

**Teaches**:
A Teacher _teaches_ a Student iff at least one non-deleted **Lesson** exists between them. This is the canonical definition of teacher-student membership and is materialized by the `teacher_students` Postgres view. Consequences (intentional, see ADR-0001 context):

- A Profile that has been created but never had a Lesson is not yet anyone's Student.
- A Student who has changed teachers retains historical Teaches relationships with prior Teachers.
  _Avoid_: defining membership through any other column or table.

**Visible Students**:
The set of Students a given Profile may see. Computed from Roles + Teaches:

- Admin → all Students
- Teacher → Students they Teach
- Student → just themselves
  This is what `StudentAccess.visibleStudentIds()` returns. Database queries do **not** apply this set as a `WHERE` clause — RLS does. The set exists to populate UI selectors and to produce pre-write 403s.

**StudentAccess**:
The single module that answers "who may this Profile see?" Two operations: `visibleStudentIds()` and `canView(studentId)`. There is no `scope(query)` operation — RLS does that (see ADR-0001).

## Relationships

- A **Profile** has one or more **Roles** and zero or more **Flags**.
- A **Lesson** links exactly one Teacher Profile to exactly one Student Profile.
- A **Teaches** relationship between two Profiles is _derived_ from their non-deleted Lessons; it is not stored directly.
- **StudentAccess** is the only consumer that resolves Roles + Teaches into **Visible Students**.

## Flagged ambiguities

- "User" is used in code to mean both the Supabase `auth.users` row and the **Profile**. Resolved here: when in doubt, the domain term is **Profile**. `User` only refers to the Supabase auth row (returned by `auth.getUser()`).
- "Role" was previously stretched to cover `is_parent` and `is_development`. Resolved: those are **Flags**, not Roles.
- `getTeacherStudentIds` was implemented twice (`lib/queries/teacher-students.ts` against the view, `app/api/lessons/handlers.ts` against the `lessons` table). Resolved: the view is canonical; the second copy is being removed as part of `StudentAccess` extraction.
