'use client';

import type { ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';

import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import { SKILL_STATUSES, type SkillStatus } from '@/types/StudentSkills';

const ROW_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 160px',
  gap: 12,
  alignItems: 'center',
};

const STATUS_COLOR: Record<SkillStatus, string> = {
  developing: 'var(--ink-4)',
  progressing: 'var(--gold-2)',
  proficient: 'var(--gold-2)',
  mastered: 'var(--success)',
};

const STATUS_TEXT_STYLE = {
  fontFamily: 'var(--mono)',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '.08em',
};

const SELECT_STYLE = {
  ...STATUS_TEXT_STYLE,
  background: 'var(--card)',
  border: '1px solid var(--rule)',
  borderRadius: 6,
  padding: '4px 6px',
  justifySelf: 'end' as const,
};

const statusLabelKey = (status: SkillStatus | null): string =>
  status ? `skillStatus${status[0].toUpperCase()}${status.slice(1)}` : 'skillStatusNotStarted';

type Row = { skill: Skill; studentSkill: StudentSkill | undefined };

const StatusSelect = ({
  skillId,
  skillName,
  status,
  isUpdating,
  onUpdate,
}: {
  skillId: string;
  skillName: string;
  status: SkillStatus | null;
  isUpdating: boolean;
  onUpdate: (skillId: string, status: SkillStatus) => void;
}) => {
  const t = useTranslations('Users');

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as SkillStatus;
    if (SKILL_STATUSES.includes(value)) onUpdate(skillId, value);
  };

  return (
    <select
      aria-label={`${t('detailTabSkills')}: ${skillName}`}
      value={status ?? ''}
      onChange={handleChange}
      disabled={isUpdating}
      style={{
        ...SELECT_STYLE,
        color: STATUS_COLOR[status ?? 'developing'],
        cursor: isUpdating ? 'wait' : 'pointer',
      }}
    >
      <option value="" disabled>
        {t('skillStatusNotStarted')}
      </option>
      {SKILL_STATUSES.map((s) => (
        <option key={s} value={s}>
          {t(statusLabelKey(s))}
        </option>
      ))}
    </select>
  );
};

const StatusBadge = ({ status }: { status: SkillStatus | null }) => {
  const t = useTranslations('Users');
  return (
    <span
      style={{
        ...STATUS_TEXT_STYLE,
        justifySelf: 'end',
        color: STATUS_COLOR[status ?? 'developing'],
      }}
    >
      {t(statusLabelKey(status))}
    </span>
  );
};

const SkillRow = ({
  row,
  isLast,
  canEdit,
  isUpdating,
  onUpdate,
}: {
  row: Row;
  isLast: boolean;
  canEdit: boolean;
  isUpdating: boolean;
  onUpdate: (skillId: string, status: SkillStatus) => void;
}) => {
  const status = (row.studentSkill?.status as SkillStatus | undefined) ?? null;

  return (
    <div
      style={{
        ...ROW_GRID,
        padding: '12px 22px',
        borderBottom: isLast ? 'none' : '1px solid var(--rule)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14 }}>
          {row.skill.name}
        </div>
        <div
          style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}
        >
          {row.skill.category}
        </div>
      </div>

      {canEdit ? (
        <StatusSelect
          skillId={row.skill.id}
          skillName={row.skill.name}
          status={status}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
        />
      ) : (
        <StatusBadge status={status} />
      )}
    </div>
  );
};

type Props = {
  skills: Skill[];
  studentSkills: StudentSkill[];
  canEdit: boolean;
  isUpdating: boolean;
  onUpdate: (skillId: string, status: SkillStatus) => void;
};

export const StudentDetailSkillsLevel = ({
  skills,
  studentSkills,
  canEdit,
  isUpdating,
  onUpdate,
}: Props) => {
  const rows: Row[] = skills.map((skill) => ({
    skill,
    studentSkill: studentSkills.find((ss) => ss.skill_id === skill.id),
  }));

  return (
    <div>
      {rows.map((row, i) => (
        <SkillRow
          key={row.skill.id}
          row={row}
          isLast={i === rows.length - 1}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  );
};
