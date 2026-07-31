import type { AIGenerationType } from '@/types/ai-generation';

type Translator = (key: string, values?: Record<string, string | number>) => string;

/** Convert literal \n sequences to real newlines */
export function normalizeNewlines(content: string): string {
  return content.replace(/\\n/g, '\n');
}

/** Strip markdown syntax and collapse whitespace into clean plaintext */
export function stripMarkdown(content: string): string {
  return normalizeNewlines(content)
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function truncateContent(content: string, maxLength = 120): string {
  if (!content) return '';
  const clean = stripMarkdown(content);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trimEnd() + '...';
}

export function getGenerationTypeColor(type: AIGenerationType): string {
  const colors: Record<AIGenerationType, string> = {
    lesson_notes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    assignment: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    email_draft: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    post_lesson_summary: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    student_progress: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    admin_insights: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
    song_notes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    chat: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };
  return colors[type];
}

// "just now" / "{n}m/h ago" stay terse (invariant units) in both locales;
// "day(s)" gets a manual singular/plural swap since Polish "dzień"/"dni" can't
// share one word. Mirrors formatRelative in notifications.helpers.ts. The
// exact calendar-date fallback (>= 7 days) intentionally keeps its runtime
// locale — see the hydration-mismatch note on toLocaleDateString('en-US', ...)
// in RepertoireCard.tsx.
export function formatRelativeDate(dateStr: string, t: Translator): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return t('historyTableTimeJustNow');
  if (diffMins < 60) return t('historyTableTimeMinutesAgo', { count: diffMins });

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t('historyTableTimeHoursAgo', { count: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    const unit = diffDays === 1 ? t('historyTableTimeDaySingular') : t('historyTableTimeDayPlural');
    return t('historyTableTimeDaysAgo', { count: diffDays, unit });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
