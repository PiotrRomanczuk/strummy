import type { AIGenerationType } from '@/types/ai-generation';

// Translation-key lookup (not the labels themselves) — callers supply `t`
// from their own `useTranslations('AI')` so labels render in the active
// locale. Mirrors notification-preferences.i18n.ts. The English fallback
// copy itself lives in types/ai-generation.ts (GENERATION_TYPE_LABELS) for
// non-i18n consumers (e.g. debug tooling) — every user-facing render in the
// AI domain goes through this lookup instead.

type Translator = (key: string, values?: Record<string, string | number>) => string;

const GENERATION_TYPE_LABEL_KEYS: Record<AIGenerationType, string> = {
  lesson_notes: 'generationTypeLessonNotes',
  assignment: 'generationTypeAssignment',
  email_draft: 'generationTypeEmailDraft',
  post_lesson_summary: 'generationTypePostLessonSummary',
  student_progress: 'generationTypeStudentProgress',
  admin_insights: 'generationTypeAdminInsights',
  song_notes: 'generationTypeSongNotes',
  chat: 'generationTypeChat',
};

export const generationTypeLabel = (type: AIGenerationType, t: Translator): string =>
  t(GENERATION_TYPE_LABEL_KEYS[type]);
