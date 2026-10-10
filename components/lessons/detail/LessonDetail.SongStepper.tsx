'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import { updateLessonSongStatus } from '@/app/dashboard/lessons/actions';
import {
  STAGES,
  STAGE_COLOR,
  stageLabelKey,
  type StageKey,
} from '@/components/songs/SongPrimitives';

const isStageKey = (value: string | null): value is StageKey =>
  value != null && STAGES.some((stage) => stage.key === value);

type Props = {
  lessonId: string;
  songId: string;
  initialStatus: string | null;
  readOnly: boolean;
  /** Mobile mockup: segments only, no stage names underneath. */
  hideLabels?: boolean;
};

/**
 * Per-song progress stepper. Reuses the shared STAGES + the existing
 * `updateLessonSongStatus` server action (RLS-scoped, Zod-validated). Teachers
 * click a segment to advance the stage; students see it read-only.
 */
export const LessonSongStepper = ({
  lessonId,
  songId,
  initialStatus,
  readOnly,
  hideLabels = false,
}: Props) => {
  const t = useTranslations('Songs');
  const [status, setStatus] = useState<StageKey | null>(
    isStageKey(initialStatus) ? initialStatus : null
  );
  const [isPending, startTransition] = useTransition();

  const activeIdx = status ? STAGES.findIndex((stage) => stage.key === status) : -1;
  const activeColor = status ? STAGE_COLOR[status] : 'var(--rule)';

  const commit = (key: StageKey) => {
    if (readOnly || key === status) return;
    const previous = status;
    setStatus(key);
    startTransition(async () => {
      try {
        await updateLessonSongStatus(lessonId, songId, key);
      } catch {
        setStatus(previous);
      }
    });
  };

  return (
    <div style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity .15s' }}>
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', width: '100%' }}>
        {STAGES.map((stage, i) => {
          const stageLabel = t(stageLabelKey(stage.key));
          const filled = i <= activeIdx;
          const segStyle = {
            flex: 1,
            height: 8,
            borderRadius: 2,
            padding: 0,
            border: 'none',
            background: filled ? activeColor : 'var(--rule)',
          };
          return readOnly ? (
            <div key={stage.key} title={stageLabel} style={segStyle} />
          ) : (
            <button
              key={stage.key}
              type="button"
              onClick={() => commit(stage.key)}
              disabled={isPending}
              aria-label={t('setStatusTo', { label: stageLabel })}
              title={stageLabel}
              style={{ ...segStyle, cursor: isPending ? 'wait' : 'pointer' }}
            />
          );
        })}
      </div>
      {/* Claude Design StageStepper: every stage named under its segment,
          the current one in its colour. Labels are clickable like segments. */}
      {!hideLabels && (
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          {STAGES.map((stage) => {
            const isCurrent = stage.key === status;
            return (
              <span
                key={stage.key}
                onClick={() => commit(stage.key)}
                style={{
                  color: isCurrent ? activeColor : 'var(--ink-4)',
                  fontWeight: isCurrent ? 500 : 400,
                  cursor: readOnly ? 'default' : 'pointer',
                }}
              >
                {t(`stageShort.${stage.key}`)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
