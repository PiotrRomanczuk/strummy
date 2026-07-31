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
 * Turned off 2026-07-31 — the feature did not earn its place in the product.
 * Visibility only: `/dashboard/practice` still resolves by direct URL, the
 * server actions and `practice_sessions` rows are untouched, and flipping this
 * back to `true` restores every surface above with no other change.
 */
export const SHOW_PRACTICE_FEATURES = false;
