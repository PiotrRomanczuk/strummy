'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useAssignmentFormSubmit } from '@/components/assignments/create/useAssignmentFormSubmit';
import type { SongOption, StudentOption } from '@/lib/services/lesson-form-data';
import {
  DAILY_TARGET_OPTIONS,
  SubmissionTypeEnum,
  type SubmissionType,
} from '@/schemas/AssignmentSchema';

import { QaField, QaStudents, qaInput } from './QuickAssign.Fields';
import { QaSong } from './QuickAssign.Song';

const SUBMISSION_KEYS: Record<SubmissionType, string> = {
  self_report: 'submissionTypeSelfReport',
  audio: 'submissionTypeAudioRecording',
  video: 'submissionTypeVideo',
  note: 'submissionTypeNote',
};

/** Claude Design "Quick assign" composer — the list page's right-hand card. */
export const QuickAssign = ({
  students,
  songs,
}: {
  students: StudentOption[];
  songs: SongOption[];
}) => {
  const t = useTranslations('Assignments');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [songId, setSongId] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dailyTarget, setDailyTarget] = useState<number | null>(null);
  const [submissionType, setSubmissionType] = useState<SubmissionType>('self_report');
  const song = songs.find((s) => s.id === songId);

  const { error, fieldErrors, isSaving, handleSubmit } = useAssignmentFormSubmit({
    mode: 'create',
    studentIds,
    title: '',
    fallbackTitle: song?.title ?? '',
    description,
    dueDate,
    songId,
    checklist: [],
    chordIds: [],
    dailyTargetMinutes: dailyTarget,
    submissionType,
  });
  const fieldError = fieldErrors.student ?? fieldErrors.title ?? error;

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={t('quickAssignTitle')}
      style={{ background: 'var(--card)', border: '1px solid var(--rule)', borderRadius: 10 }}
    >
      <div style={{ padding: '20px 24px 14px' }}>
        <div
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
            textTransform: 'uppercase',
            letterSpacing: '.14em',
          }}
        >
          {t('quickAssignEyebrow')}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 500, marginTop: 4 }}>
          {t('quickAssignTitle')}
        </div>
      </div>
      <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <QaField label={t('quickAssignToStudents')}>
          <QaStudents
            students={students}
            selectedIds={studentIds}
            addLabel={t('quickAssignAdd')}
            onAdd={(id) => setStudentIds((ids) => [...ids, id])}
            onRemove={(id) => setStudentIds((ids) => ids.filter((x) => x !== id))}
          />
        </QaField>
        <QaField label={t('createFormSongDrillLabel')}>
          <QaSong
            songs={songs}
            songId={songId}
            placeholder={t('createFormNoSongOption')}
            onSongId={setSongId}
          />
        </QaField>
        <QaField label={t('createFormTaskLabel')} htmlFor="quick-assign-task">
          <textarea
            id="quick-assign-task"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('createFormBriefPlaceholder')}
            style={{
              ...qaInput,
              fontFamily: 'var(--sans)',
              lineHeight: 1.5,
              minHeight: 72,
              resize: 'vertical',
              padding: '10px 12px',
            }}
          />
        </QaField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <QaField label={t('quickAssignDue')} htmlFor="quick-assign-due">
            <input
              id="quick-assign-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={qaInput}
            />
          </QaField>
          <QaField label={t('createFormDailyTargetLabel')} htmlFor="quick-assign-target">
            <select
              id="quick-assign-target"
              value={dailyTarget ?? ''}
              onChange={(e) => setDailyTarget(e.target.value ? Number(e.target.value) : null)}
              style={{ ...qaInput, cursor: 'pointer' }}
            >
              <option value="">{t('createFormNoTargetOption')}</option>
              {DAILY_TARGET_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {t('createFormMinPerDay', { minutes: m })}
                </option>
              ))}
            </select>
          </QaField>
        </div>
        <QaField label={t('submissionTypeQuestion')}>
          <div role="radiogroup" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SubmissionTypeEnum.options.map((opt) => {
              const isOn = submissionType === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  role="radio"
                  aria-checked={isOn}
                  onClick={() => setSubmissionType(opt)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer',
                    background: isOn ? 'var(--ink)' : 'var(--paper)',
                    color: isOn ? 'var(--paper)' : 'var(--ink-3)',
                    border: `1px solid ${isOn ? 'var(--ink)' : 'var(--rule)'}`,
                  }}
                >
                  {t(SUBMISSION_KEYS[opt])}
                </button>
              );
            })}
          </div>
        </QaField>
        {fieldError && (
          <div style={{ color: 'var(--danger)', fontSize: 12, fontFamily: 'var(--mono)' }}>
            {fieldError}
          </div>
        )}
        <button
          type="submit"
          disabled={isSaving}
          style={{
            marginTop: 6,
            padding: 12,
            borderRadius: 8,
            border: 'none',
            background: 'var(--ink)',
            color: 'var(--paper)',
            fontSize: 13,
            fontWeight: 500,
            cursor: isSaving ? 'wait' : 'pointer',
          }}
        >
          {isSaving ? t('createFormSavingButton') : t('quickAssignSend')}
        </button>
      </div>
    </form>
  );
};
