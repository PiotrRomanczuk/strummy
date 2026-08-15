/**
 * AI server actions — barrel.
 *
 * The implementation was decomposed from a single 1140-LOC file into per-domain
 * modules under this directory. This barrel preserves the original import surface
 * (`@/app/actions/ai`) so existing callers and tests need no changes. Each
 * domain module carries its own `'use server'` directive; shared internal
 * helpers live in `./shared` (a plain module).
 */
export { generateAIResponseStream, generateAIResponse, getAvailableModels } from './core';

// NOTE: `getProviderAppropriateModel` is an internal helper in ./shared and is
// intentionally NOT re-exported here. ./shared is a plain (non-'use server')
// module importing Node-only deps (pino, supabase/server); re-exporting it through
// this barrel pulls that module into client bundles (build error: process.stdout in
// the Edge/Browser runtime). Import from './shared' directly in server code/tests.

export {
  generateLessonNotesStream,
  generateLessonNotes,
  generatePostLessonSummaryStream,
  generatePostLessonSummary,
} from './lessons';

export { generateAssignmentStream, generateAssignment } from './assignments';

export { generateEmailDraftStream, generateEmailDraft } from './email';

export { analyzeStudentProgressStream, analyzeStudentProgress } from './students';

export { generateSongNotesStream, enhanceSongNotesStream } from './songs';

export { generateAdminInsightsStream, generateAdminInsights } from './admin';
