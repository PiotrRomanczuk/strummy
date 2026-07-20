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
 * Hidden 2026-07-20 to slim the app down to the core teaching loop
 * (lessons / songs / assignments). Set to `true` to bring the AI UI back
 * everywhere at once.
 */
export const SHOW_AI_FEATURES = false;
