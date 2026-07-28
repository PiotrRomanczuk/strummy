---
created: 2026-07-23
updated: 2026-07-23
---

# E2E Tested Journeys — actual inventory

> **Superseded by [`2026-07-28-e2e-tested-journeys.md`](2026-07-28-e2e-tested-journeys.md)**
> (61 specs / 297 cases / 43 skipped, and it names the user type each journey runs as).
> Kept as the 2026-07-23 snapshot.

Every Playwright journey that exists in `tests/e2e/`, grouped by area. Generated from the specs (source of truth). 🚫 = skipped/fixme.

**58 spec files · 281 test cases · 23 skipped.** (Supersedes the stale coverage numbers in `E2E_JOURNEYS.md`, which catalogs journeys *needed*; this lists journeys *tested*.)


## Smoke & landing  (14)

**`smoke/critical-path.spec.ts`**
- should load the application successfully
- should have working authentication system
- should have protected dashboard route
- should have working navigation system
- should have working API endpoints
- should handle 404 pages gracefully
- should have responsive design basics
- should not have critical console errors

**`smoke/landing-page.spec.ts`**
- hero renders the headline, subheadline, and primary CTAs
- header nav links to marketing sections and auth CTAs are correct
- capabilities section lists what the product does
- pricing section shows all three tiers with working CTAs
- FAQ section renders real questions and a demo CTA
- final CTA section renders with heading and sign-up/demo links

## Auth & onboarding  (68)

**`auth/role-login.spec.ts`**
- admin can sign in and land on dashboard
- teacher can sign in and land on dashboard
- student can sign in and land on dashboard

**`auth/sign-out.spec.ts`**
- A1.2 admin signs out via topbar and lands on sign-in
- A1.2 student signs out via topbar and lands on sign-in

**`auth/sign-up-complete.spec.ts`**
- should display sign-up form with all required fields
- should have back to sign-in navigation
- should have link to sign-in for existing users
- should display Google sign-up option
- should show error when first name is empty on blur
- should clear error when user starts typing
- should show error for excessively long first name
- should show error when last name is empty on blur
- should show error for excessively long last name
- should show error when email is empty on blur
- should validate email format
- should accept valid email format
- should show error for password shorter than the minimum length
- should accept password with 6 or more characters
- should display password strength meter
- should toggle password visibility
- should show error when passwords do not match
- should show success indicator when passwords match
- should clear mismatch error when user corrects password
- should prevent submission with empty form
- should prevent submission with only partial data
- should show loading state during submission
- should successfully create account and show email verification screen
- should display verification instructions
- should have continue to sign-in button
- should show resend option after successful sign-up
- should have countdown timer for resend button
- should show error when email already exists
- should suggest using forgot password for existing accounts
- should have functional Google sign-up button
- should disable form during Google sign-in
- should be mobile responsive
- should work on tablet viewport
- should have proper ARIA labels
- should support keyboard navigation
- should have proper form labels
- should handle special characters in name fields
- should trim whitespace from inputs
- should prevent double submission

**`onboarding/complete-flow.spec.ts`**
- should redirect to sign-in when not authenticated
- should redirect to dashboard if already onboarded
- should display Step 1: Learning Goals  🚫
- should require at least one goal to proceed  🚫
- should navigate to Step 2: Skill Level  🚫
- should allow navigation back to Step 1  🚫
- should navigate to Step 3: Preferences  🚫
- should allow skipping to preferences from step 1  🚫
- should validate required fields before submission  🚫
- should show AI personalization badge  🚫
- should toggle goal selections  🚫
- should complete onboarding and redirect to dashboard  🚫
- should show loading state during submission  🚫
- should save user as student role after onboarding  🚫
- should prevent re-accessing onboarding after completion  🚫
- should have proper ARIA labels for step indicator  🚫
- should have proper ARIA labels for selection buttons  🚫
- should display step labels correctly  🚫
- should be responsive and mobile-friendly  🚫
- should handle network errors gracefully  🚫
- should display error message on submission failure  🚫
- should not lose form data on error  🚫
- should work after fresh sign-up  🚫
- should show personalized welcome message  🚫

## End-to-end role journeys  (22)

**`student-full-journey.spec.ts`**
- Student complete journey @journey @student

**`student-learning-journey.spec.ts`**
- should display student dashboard with key metrics
- should show next upcoming lesson
- should display repertoire / song progress
- should navigate to lessons page
- should only see own lessons (not other students)
- should click on a lesson to view details
- should navigate to songs page
- should display assigned or available songs
- should click on a song to view details
- should display song details description
- should navigate to assignments page
- should display assignment status (pending, completed, overdue)
- should click on assignment to view details
- should be able to mark assignment as complete (if pending)
- should navigate to profile page
- should display current user information
- should navigate to settings
- should be able to toggle theme (if available)
- should NOT have access to admin-only pages
- should NOT see other students lessons

**`teacher-full-journey.spec.ts`**
- Teacher complete journey @journey @teacher

## Dashboard shell  (8)

**`dashboard/sidebar.spec.ts`**
- admin sees only the core teaching + students links
- teacher sees the same core set, no non-core tools
- student sees only the core learning links

**`dashboard/states.spec.ts`**
- ${role} dashboard still renders after adding states module

**`dashboard/topbar.spec.ts`**
- admin sees topbar with user menu and role switcher (multi-role)
- teacher sees topbar with user menu, no role switcher (single role)
- student sees topbar with user menu, no role switcher (single role)
- user menu opens and exposes sign-out for each role

## Cross-role & access control  (8)

**`cross-role/access-control.spec.ts`**
- C1.1 student on /dashboard/users sees only own data (RLS-scoped)
- C1.2 student redirected/blocked from /dashboard/ai
- C1.3 student on /dashboard/calendar sees calendar without crash
- C1.4 student on /dashboard/logs sees no admin log data
- C2 student lessons page shows only own lessons (no cross-student data)

**`cross-role/rls-data-isolation.spec.ts`**
- setup sanity: service role can see student B private rows (so empty ≠ missing data)
- student A cannot read student B's ${table}
- student A's own ${table} read returns only permitted rows (no leak of B)

## Teacher — CRUD, tools & workflows  (53)

**`teacher/assignment-history.spec.ts`**
- teacher sees a 3-entry history timeline: created, then two status changes

**`teacher/assignment-target-submission.spec.ts`**
- create an assignment with a 10-min target + audio submission → shows on detail (NEW)

**`teacher/assignment-templates.spec.ts`**
- templates list shows seeded template and a New-template affordance
- creates a template through the UI and it lands in the list
- starts a new assignment from a template, inheriting title + checklist

**`teacher/assignments-crud.spec.ts`**
- assignments list loads with heading and New Assignment button @mobile
- assignment CRUD lifecycle: create → view → edit → delete

**`teacher/backfill-at-risk.spec.ts`**
- renders the at-risk student with a plausible days badge and a working profile link
- drops out of the card once the student has practiced recently

**`teacher/calendar-conflicts.spec.ts`**
- A8.1 calendar page shows the Google connection status
- A8.2 resolve a seeded sync conflict (use_local)

**`teacher/deleted-stub-routes.spec.ts`**
- ${path} renders not-found
- /dashboard/lessons/<id>/live renders not-found

**`teacher/fretboard.spec.ts`**
- loads with the default A pentatonic minor view and a root highlight
- changing the key moves the root and overlay
- sharp/flat toggle relabels notes
- scale overlay reflects the selected scale
- chord mode highlights chord tones
- show-intervals toggle swaps note names for interval names
- hide-non-scale toggle hides notes outside the scale
- clicking a fret identifies the note
- selections are written to the URL
- a shared URL restores the view
- mobile: board and controls fit the viewport without horizontal overflow
- mobile: key/scale/chord/interval controls remain reachable and usable

**`teacher/lesson-duration-format.spec.ts`**
- create a 30-min video-call lesson → duration + format show on detail (NEW)

**`teacher/lesson-repeat-weekly.spec.ts`**
- unchecked box behaves exactly as a normal single-lesson create
- checking repeat weekly creates N lessons, 7 days apart, and returns to the list

**`teacher/lesson-song-status.spec.ts`**
- A4.3 lesson detail loads and assigned song appears in Repertoire section
- A4.3 lesson song status can be updated directly via DB and reflects on reload

**`teacher/lessons-crud.spec.ts`**
- lessons list loads with heading and New Lesson button @mobile
- lesson CRUD lifecycle: create → view → edit → delete

**`teacher/song-cover.spec.ts`**
- create a song with a cover URL → persists to cover_image_url (NEW)

**`teacher/song-production-tab.spec.ts`**
- Production tab renders and /api/content/posts round-trips without a 500
- student does not see the Production tab

**`teacher/songs-crud.spec.ts`**
- songs list loads with heading and New Song button @mobile
- song CRUD lifecycle: create → view → edit → search → delete
- create song with required fields @mobile

**`teacher/student-intake.spec.ts`**
- add a student with identity/contact/schedule/billing → persists to profile (NEW)

**`teacher/student-onboarding.spec.ts`**
- A7.1 users list shows "+ New student" button
- A7.2 /dashboard/users/new renders the create form
- A7.2 create form requires first name, last name, and invite email
- A7.2 create form submits and redirects to student profile
- A7.3 student detail page shows "Import songs" link
- A7.4 song import page loads and parses textarea into preview
- A7.5 shadow user row in users list shows "Invite →" button when email is set

**`teacher/student-preferences.spec.ts`**
- a student who completed onboarding shows their skill level + goals
- a student without a preferences row renders no empty section

**`teacher/users-management.spec.ts`**
- A6.1 users list loads and renders rows
- A6.1 search filters roster by name/email
- A6.1 role filter shows only students
- A6.2 student detail page renders profile
- A6.4 admin can edit and revert a student profile name

## Student — scoped journeys  (36)

**`student/assignments-interact.spec.ts`**
- assignments list loads with no Create button @mobile
- view assignment detail @mobile
- update status: not_started to in_progress @mobile
- update status: in_progress to completed @mobile
- no edit control for assignment content @mobile
- filter assignments by status @mobile
- ticks an item, updates progress %, and persists across reload

**`student/chord-quiz-srs.spec.ts`**
- C1.1 chord quiz page loads with quiz UI, not Coming Soon
- C1.2 student can answer a question and advance
- C1.3 no review toggle when no SRS state exists for student
- C1.4 review toggle appears when chords are seeded as due
- C1.5 review mode limits quiz to the number of due chords
- C1.6 admin can access chord quiz page

**`student/lessons-read.spec.ts`**
- lessons list loads with no Create button @mobile
- view lesson detail @mobile
- no edit or delete controls on lesson detail @mobile
- lesson detail shows songs section @mobile
- only own lessons are visible @desktop

**`student/practice-bpm.spec.ts`**
- B7.1 BPM input hidden when no song selected
- B7.2 BPM input appears after selecting a song
- B7.3 seeded session with BPM shows badge in history
- B7.4 log session with BPM, badge visible in history
- B7.5 admin practice page loads correctly

**`student/practice.spec.ts`**
- B6.4 practice page loads for student
- B6.3 past sessions have no Remove button
- B6.1 log a practice session
- B6.2 delete same-day entry (undo)
- B6.2 PRA-1 undo a song-linked session (previously raised 42703)

**`student/repertoire.spec.ts`**
- B7.1 view own repertoire with seeded entry
- B7.2 update own difficulty self-rating
- B7.3 no add/remove song controls for student

**`student/songs-read.spec.ts`**
- songs list loads with no New Song button @mobile
- view song detail @mobile
- no edit or delete controls on song detail @mobile
- search songs on list @desktop
- song detail shows resource links if available @mobile

## Admin-only  (8)

**`admin/debug-dashboard.spec.ts`**
- admin sees live service + AI infrastructure status
- teacher is redirected away

**`admin/lockout-widget.spec.ts`**
- admin dashboard lists the locked account and Unlock clears it
- non-admin dashboard has no locked-accounts widget

**`admin/system-logs.spec.ts`**
- admin sees the seeded error row
- level filter narrows results
- teacher is redirected away from /dashboard/logs
- student is redirected away from /dashboard/logs

## AI assistant  (17)

**`ai/ai-playground.spec.ts`**
- page loads with welcome message
- chat input and send button are visible
- suggested prompts appear on a fresh conversation
- suggested prompt sends a message
- type and send a message
- New Conversation resets the transcript to the welcome message

**`ai/assignment-ai.spec.ts`**
- AI button is disabled before a student and title are provided
- AI button becomes enabled after selecting a student and entering a title
- AI button triggers generation
- generated content populates the brief field

**`ai/feedback.spec.ts`**
- thumbs up on a completed response persists is_helpful=true

**`ai/lesson-notes-ai.spec.ts`**
- AI button is disabled before student, songs, and title are set
- AI button becomes enabled after selecting a student, a song, and a title
- AI button is disabled when the lesson title is empty
- AI button triggers generation
- generated content populates the notes field

**`ai/lesson-notes-form.spec.ts`**
- AI button enables and streams notes for a student + song + title

## Notifications  (6)

**`notifications/inbox.spec.ts`**
- A10.1 notifications inbox renders with unread entries
- A10.1 mark single notification as read
- A10.1 mark all notifications as read
- A10.1 notifications inbox is usable at mobile viewport @mobile

**`notifications/prefs.spec.ts`**
- A10.2 toggle a notification preference off then back on
- B8.2 student can toggle own notification preferences

## Settings  (7)

**`settings/api-keys.spec.ts`**
- A10.3 create an API key, see it in the table, then delete it
- B8.3 student can create and delete their own API key

**`settings/avatar-upload.spec.ts`**
- a non-image file is rejected with a visible error, no network call made
- an oversized image is rejected with a visible error

**`settings/integrations.spec.ts`**
- Integrations section renders on /dashboard/settings itself
- connect/disconnect UI matches the real Google integration state
- clicking Connect navigates toward /api/auth/google

## Demo mode  (10)

**`demo/demo-mutation-guards.spec.ts`**
- demo user can browse all pages without errors
- demo user cannot create a song
- demo user cannot create a lesson
- demo user cannot create an assignment
- demo user cannot create API keys or upload files
- demo user is blocked by all mutation API endpoints
- demo user cannot send AI messages
- non-demo teacher can create a song via API

**`demo/demo-screenshots.spec.ts`**
- Desktop — all pages
- Mobile — all pages

## Mobile / responsive  (11)

**`mobile/mobile-responsiveness.spec.ts`**
- dashboard loads and displays stats grid on mobile (${role})
- mobile bottom nav is visible on narrow screens
- hamburger menu opens drawer on mobile
- touch targets meet 44px minimum on mobile
- sign-in form is usable on mobile
- songs list renders mobile card view
- no horizontal overflow on key pages
- landing page renders without horizontal overflow on mobile
- header collapses non-essential nav on narrow mobile viewports
- iPad shows sidebar or tablet navigation
- dashboard stats grid uses appropriate columns on iPad

## Integration workflows  (12)

**`integration/workflows.spec.ts`**
- should complete full lesson lifecycle: create → verify → student view → delete
- should complete assignment lifecycle: create → verify → student view → delete
- should complete song lifecycle: create → verify → delete
- should complete user lifecycle: create shadow user → verify → delete  🚫
- should verify admin has access to all sections
- should verify student has limited navigation options
- should verify role-based filtering in lessons
- should verify data isolation between roles
- should verify consistent navigation across workflows
- should verify lesson-song relationship workflow
- should verify assignment-student relationship workflow
- should verify cross-feature data consistency

## Manual / seed journeys  (1)

**`manual/kuba-onboarding.spec.ts`**
- create student → import 41 songs → send invite
