'use client';

import { useTranslations } from 'next-intl';

import { formStyles as s } from '@/components/shared/form-styles';
import { FormSection } from '@/components/shared/FormSection';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';
import { DAILY_TARGET_OPTIONS } from '@/schemas/AssignmentSchema';

type Props = {
  mode: 'create' | 'edit';
  students: StudentOption[];
  songs: SongOption[];
  studentId: string;
  title: string;
  dueDate: string;
  songId: string;
  description: string;
  dailyTargetMinutes: number | null;
  fieldErrors: { student?: string; title?: string };
  onStudentId: (v: string) => void;
  onTitle: (v: string) => void;
  onDueDate: (v: string) => void;
  onSongId: (v: string) => void;
  onDescription: (v: string) => void;
  onDailyTargetMinutes: (v: number | null) => void;
};

/** Sections I (who) + II (what/when) of the dedicated assignment form. */
export const AssignmentCreateFields = ({
  mode,
  students,
  songs,
  studentId,
  title,
  dueDate,
  songId,
  description,
  dailyTargetMinutes,
  fieldErrors,
  onStudentId,
  onTitle,
  onDueDate,
  onSongId,
  onDescription,
  onDailyTargetMinutes,
}: Props) => {
  const t = useTranslations('Assignments');

  return (
    <>
      {mode === 'create' && (
        <FormSection
          numeral={t('createFormNumeralWho')}
          title={t('createFormSectionStudentTitle')}
          count={1}
          populated={studentId ? 1 : 0}
        >
          <div style={s.field}>
            <label style={s.label} htmlFor="assignment-student">
              {t('createFormStudentLabel')}
            </label>
            <select
              id="assignment-student"
              style={{
                ...s.input,
                ...(fieldErrors.student ? { borderColor: 'var(--danger)' } : {}),
              }}
              value={studentId}
              aria-invalid={Boolean(fieldErrors.student)}
              onChange={(e) => onStudentId(e.target.value)}
            >
              <option value="">{t('createFormSelectStudentPlaceholder')}</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name ?? st.email ?? t('createFormUnnamedStudent')}{' '}
                  {st.email ? `· ${st.email}` : ''}
                </option>
              ))}
            </select>
            {fieldErrors.student && (
              <div style={{ ...s.error, marginBottom: 0, marginTop: 6, fontSize: 12 }}>
                {fieldErrors.student}
              </div>
            )}
          </div>
        </FormSection>
      )}

      <FormSection
        numeral={t('createFormNumeralWhatWhen')}
        title={t('createFormSectionSongBriefTitle')}
        count={2}
        populated={[title, dueDate].filter(Boolean).length}
      >
        <div style={s.field}>
          <label style={s.label} htmlFor="assignment-title">
            {t('createFormTitleLabel')}
          </label>
          <input
            id="assignment-title"
            style={{ ...s.input, ...(fieldErrors.title ? { borderColor: 'var(--danger)' } : {}) }}
            value={title}
            placeholder={t('createFormTitlePlaceholder')}
            aria-invalid={Boolean(fieldErrors.title)}
            onChange={(e) => onTitle(e.target.value)}
          />
          {fieldErrors.title && (
            <div style={{ ...s.error, marginBottom: 0, marginTop: 6, fontSize: 12 }}>
              {fieldErrors.title}
            </div>
          )}
        </div>

        <div className="ui-form-row-2" style={{ gap: 16 }}>
          <div style={s.field}>
            <label style={s.label} htmlFor="assignment-due">
              {t('createFormDueDateLabel')}
            </label>
            <input
              id="assignment-due"
              type="date"
              style={s.input}
              value={dueDate}
              onChange={(e) => onDueDate(e.target.value)}
            />
          </div>

          <div style={s.field}>
            <label style={s.label} htmlFor="assignment-daily-target">
              {t('createFormDailyTargetLabel')}
            </label>
            <select
              id="assignment-daily-target"
              style={s.input}
              value={dailyTargetMinutes ?? ''}
              onChange={(e) => onDailyTargetMinutes(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t('createFormNoTargetOption')}</option>
              {DAILY_TARGET_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {t('createFormMinPerDay', { minutes: m })}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label} htmlFor="assignment-song">
            {t('createFormSongLabel')}
          </label>
          <select
            id="assignment-song"
            style={s.input}
            value={songId}
            onChange={(e) => onSongId(e.target.value)}
          >
            <option value="">{t('createFormNoSongOption')}</option>
            {songs.map((song) => (
              <option key={song.id} value={song.id}>
                {song.title}
                {song.author ? ` — ${song.author}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ ...s.field, marginBottom: 0 }}>
          <label style={s.label} htmlFor="assignment-notes">
            {t('createFormBriefLabel')}
          </label>
          <textarea
            id="assignment-notes"
            style={s.textarea}
            value={description}
            placeholder={t('createFormBriefPlaceholder')}
            onChange={(e) => onDescription(e.target.value)}
          />
        </div>
      </FormSection>
    </>
  );
};
