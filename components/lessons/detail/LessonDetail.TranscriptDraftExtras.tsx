'use client';

import { useTranslations } from 'next-intl';

import { Checkbox } from '@/components/ui/checkbox';
import type { ResolvedLessonDraft } from '@/lib/ai/schemas/lesson-transcript-draft';
import type { ApplyAssignment } from '@/schemas/LessonDraftApplySchema';

import { DRAFT_FIELD, DRAFT_ROW, DRAFT_SECTION_LABEL, DRAFT_TAG } from './transcript-draft.styles';
import type { SkillRow } from './useTranscriptDraftSelection';

type HomeworkProps = {
  assignment: ApplyAssignment | null;
  include: boolean;
  onInclude: (include: boolean) => void;
  onChange: (assignment: ApplyAssignment) => void;
};

export function TranscriptDraftHomework({ assignment, include, onInclude, onChange }: HomeworkProps) {
  const t = useTranslations('Lessons');
  if (!assignment) return null;

  return (
    <section className="mb-5">
      <h4 className={DRAFT_SECTION_LABEL}>{t('draftHomework')}</h4>
      <div data-testid="draft-homework" className={`${DRAFT_ROW} ${include ? '' : 'opacity-60'}`}>
        <div className="flex items-center gap-2">
          <Checkbox id="draft-homework" checked={include} onCheckedChange={(c) => onInclude(c === true)} />
          <input
            aria-label={t('draftHomeworkTitle')}
            value={assignment.title}
            onChange={(e) => onChange({ ...assignment, title: e.target.value })}
            className={DRAFT_FIELD}
          />
        </div>
        {include && (
          <textarea
            aria-label={t('draftHomeworkChecklist')}
            placeholder={t('draftHomeworkChecklist')}
            value={assignment.checklist.join('\n')}
            onChange={(e) => onChange({ ...assignment, checklist: e.target.value.split('\n').slice(0, 20) })}
            onBlur={() =>
              onChange({ ...assignment, checklist: assignment.checklist.map((s) => s.trim()).filter(Boolean) })
            }
            rows={Math.max(2, assignment.checklist.length)}
            className={`${DRAFT_FIELD} mt-2 resize-y`}
          />
        )}
      </div>
    </section>
  );
}

type SkillsProps = { rows: SkillRow[]; onChange: (key: string, patch: Partial<SkillRow>) => void };

export function TranscriptDraftSkills({ rows, onChange }: SkillsProps) {
  const t = useTranslations('Lessons');
  if (!rows.length) return null;

  return (
    <section className="mb-5">
      <h4 className={DRAFT_SECTION_LABEL}>{t('draftSkills')}</h4>
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2 rounded-full border border-[var(--rule)] px-3 py-1">
            <Checkbox
              id={row.key}
              checked={row.include}
              onCheckedChange={(c) => onChange(row.key, { include: c === true })}
            />
            <label htmlFor={row.key} className="text-[13px] text-[var(--ink)]">
              {row.name}
            </label>
            <span className={DRAFT_TAG}>{t(`draftSkillStatus.${row.value.status}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const INFO_LISTS = [
  ['questions', 'draftQuestions'],
  ['teacherCommitments', 'draftCommitments'],
  ['logistics', 'draftLogistics'],
  ['profileHints', 'draftProfileHints'],
] as const;

/** Read-only findings the app has no field for — the teacher acts on them by hand. */
export function TranscriptDraftInfo({ draft }: { draft: ResolvedLessonDraft }) {
  const t = useTranslations('Lessons');
  const lists = INFO_LISTS.filter(([field]) => draft[field].length > 0);
  if (!lists.length) return null;

  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2">
      {lists.map(([field, label]) => (
        <section key={field}>
          <h4 className={DRAFT_SECTION_LABEL}>{t(label)}</h4>
          <ul className="m-0 list-disc pl-4 text-[13px] leading-[1.55] text-[var(--ink-2)]">
            {draft[field].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
