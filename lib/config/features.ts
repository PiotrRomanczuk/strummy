/**
 * Frontend feature flags — progressive reveal of surfaces in the UI.
 *
 * These gate *visibility only*. Routes, server actions, and API endpoints stay
 * intact behind the scenes, so flipping a flag back to `true` restores the
 * feature everywhere it is referenced with no other changes.
 */

/**
 * Master switch for all AI-powered UI.
 *
 * When `false`, hides:
 *  - the "AI Assistant" and "AI Chat" sidebar items (see `menuConfig.ts`)
 *  - the in-form AI generators: lesson notes, song notes, assignment
 *    suggestions, and the post-lesson summary
 *
 * AI was briefly hidden 2026-07-20 to slim the app to the core teaching loop,
 * but verified live 2026-07-19 and kept visible as main moved on. Set to
 * `false` to hide the AI UI everywhere at once if it needs to come down again.
 */
export const SHOW_AI_FEATURES = true;

/**
 * Master switch for every practice-tracking surface.
 *
 * When `false`, hides:
 *  - the "Practice Log" sidebar item and its demo-tour step
 *  - the student's "Practice time" stat on a song page
 *  - the teacher's student-detail practice tab, 14-day chart, total-practice
 *    stat, and the practice-derived health badge / reach-out prompt
 *  - the teacher dashboard's "Needs attention" card (at-risk is defined purely
 *    as days-since-practice) and practice rows in the activity feed
 *  - the parent dashboard's practice card, day-streak chip, and weekly-minutes
 *    chip (all three read off `practice_sessions`)
 *  - the practice-minutes column in the student's repertoire list
 *
 * Turned off 2026-07-31 as "did not earn its place", then turned back on
 * 2026-08-19. That judgement was made before the first real students were
 * onboarded, so it rested on no usage data. The competitive review of My Music
 * Staff (docs/analysis/2026-08-19-mymusicstaff-competitive-analysis.md §1.3)
 * found they build the paying parent's sense of value on exactly this feature,
 * while Strummy's version is the richer one — it logs tempo and ties a session
 * to a song, which theirs does not. Re-evaluate on real usage, not before.
 *
 * Visibility only: `/dashboard/practice` resolves by direct URL either way, the
 * server actions and `practice_sessions` rows are untouched, and flipping this
 * restores or hides every surface above with no other change.
 */
export const SHOW_PRACTICE_FEATURES = true;
