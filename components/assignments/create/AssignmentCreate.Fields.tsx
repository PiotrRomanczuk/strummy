'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { filledInput, formStyles as s } from '@/components/shared/form.styles';
import { FormSection } from '@/components/shared/FormSection';
import { StudentPillPicker } from '@/components/shared/StudentPillPicker';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';
import { DAILY_TARGET_OPTIONS } from '@/schemas/AssignmentSchema';

type Props = {
  mode: 'create' | 'edit';
  students: StudentOption[];
  songs: SongOption[];
  studentIds: string[];
  dueDate: string;
  songId: string;
  description: string;
  dailyTargetMinutes: number | null;
  fieldErrors: { student?: string; title?: string };
  /** Rendered under the task description (the AI generator). */
  descriptionExtra?: ReactNode;
  onToggleStudent: (id: string) => void;
  onDueDate: (v: string) => void;
  onSongId: (v: string) => void;
  onDescription: (v: string) => void;
  onDailyTargetMinutes: (v: number | null) => void;
};

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <div style={{ ...s.error, marginBottom: 0, marginTop: 6, fontSize: 12 }}>{message}</div>
  ) : null;

/** Sections I–III of the Claude Design assignment form: who · what · when. */
export const AssignmentCreateFields = ({
  mode,
  students,
  songs,
  studentIds,
  dueDate,
  songId,
  description,
  dailyTargetMinutes,
  fieldErrors,
  descriptionExtra,
  onToggleStudent,
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
          title={t('createFormSectionStudentsTitle')}
          count={students.length}
          populated={studentIds.length}
        >
          <div id="assignment-student" tabIndex={-1}>
            <StudentPillPicker
              students={students}
              selectedIds={studentIds}
              onToggle={onToggleStudent}
              label={t('createFormStudentLabel')}
              searchPlaceholder={t('createFormFindStudent')}
            />
          </div>
          <FieldError message={fieldErrors.student} />
        </FormSection>
      )}

      <FormSection
        numeral={t('createFormNumeralWhat')}
        title={t('createFormSectionSongTitle')}
        count={1}
        populated={songId || description ? 1 : 0}
      >
        <div style={s.field}>
          <label style={s.label} htmlFor="assignment-song">
            {t('createFormSongDrillLabel')}
            <span style={s.required}>*</span>
          </label>
          <select
            id="assignment-song"
            style={filledInput(Boolean(songId))}
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
          <FieldError message={fieldErrors.title} />
        </div>
        <div style={{ ...s.field, marginBottom: 0 }}>
          <label style={s.label} htmlFor="assignment-notes">
            {t('createFormTaskLabel')}
          </label>
          <textarea
            id="assignment-notes"
            style={{ ...s.textarea, minHeight: 80 }}
            value={description}
            placeholder={t('createFormBriefPlaceholder')}
            onChange={(e) => onDescription(e.target.value)}
          />
          {descriptionExtra}
        </div>
      </FormSection>

      <FormSection
        numeral={t('createFormNumeralWhen')}
        title={t('createFormSectionDueTitle')}
        count={2}
        populated={[dueDate, dailyTargetMinutes].filter(Boolean).length}
      >
        <div className="ui-form-row-2" style={{ gap: 16 }}>
          <div style={{ ...s.field, marginBottom: 0 }}>
            <label style={s.label} htmlFor="assignment-due">
              {t('createFormDueDateLabel')}
            </label>
            <input
              id="assignment-due"
              type="date"
              style={filledInput(Boolean(dueDate))}
              value={dueDate}
              onChange={(e) => onDueDate(e.target.value)}
            />
          </div>
          <div style={{ ...s.field, marginBottom: 0 }}>
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
      </FormSection>
    </>
  );
};
