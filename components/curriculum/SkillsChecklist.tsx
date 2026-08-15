'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

// Cross-domain import, knowingly left in place: these three are pure
// presentation and `student-detail.shared` declares itself client-safe, but they
// are misfiled — promoting them to `components/shared/` would touch eight
// `StudentDetail.*` files, which is not this change. Known follow-up.
import { Card, CardHeader, Empty } from '@/components/users/student-detail.shared';
import { SkillsChecklistLevel } from './SkillsChecklist.Level';
import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import { upsertStudentSkill } from '@/app/actions/student-skills';
import { SKILL_LEVELS, type SkillLevel, type SkillStatus } from '@/types/StudentSkills';

const levelLabelKey = (level: SkillLevel): string =>
  `skillLevel${level[0].toUpperCase()}${level.slice(1)}`;

export const groupSkillsByLevel = (skills: Skill[]): Map<SkillLevel, Skill[]> => {
  const grouped = new Map<SkillLevel, Skill[]>(SKILL_LEVELS.map((l) => [l, []]));
  for (const skill of skills) {
    const level = skill.level as SkillLevel | null;
    if (level && grouped.has(level)) grouped.get(level)!.push(skill);
  }
  return grouped;
};

export const countMastered = (skills: Skill[], studentSkills: StudentSkill[]): number =>
  skills.filter(
    (skill) => studentSkills.find((ss) => ss.skill_id === skill.id)?.status === 'mastered'
  ).length;

const LevelTabs = ({
  skillsByLevel,
  studentSkills,
  activeLevel,
  onSelect,
}: {
  skillsByLevel: Map<SkillLevel, Skill[]>;
  studentSkills: StudentSkill[];
  activeLevel: SkillLevel;
  onSelect: (level: SkillLevel) => void;
}) => {
  const t = useTranslations('Users');
  return (
    <div className="ui-tabs" role="tablist" aria-label={t('detailTabSkills')}>
      {SKILL_LEVELS.map((level) => {
        const skills = skillsByLevel.get(level) ?? [];
        return (
          <button
            key={level}
            type="button"
            role="tab"
            aria-selected={activeLevel === level}
            className={`ui-tab${activeLevel === level ? ' is-active' : ''}`}
            onClick={() => onSelect(level)}
          >
            {t(levelLabelKey(level))} —{' '}
            {t('skillsProgressCount', {
              done: countMastered(skills, studentSkills),
              total: skills.length,
            })}
          </button>
        );
      })}
    </div>
  );
};

const ErrorNote = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
    <div
      style={{
        padding: '0 22px 16px',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        color: 'var(--danger, #b3452e)',
      }}
    >
      {message}
    </div>
  );
};

type Props = {
  studentId: string;
  studentSkills: StudentSkill[];
  availableSkills: Skill[];
  canEdit: boolean;
};

export const SkillsChecklist = ({ studentId, studentSkills, availableSkills, canEdit }: Props) => {
  const t = useTranslations('Users');
  const router = useRouter();
  const [activeLevel, setActiveLevel] = useState<SkillLevel>('beginner');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skillsByLevel = useMemo(() => groupSkillsByLevel(availableSkills), [availableSkills]);
  const activeSkills = skillsByLevel.get(activeLevel) ?? [];

  const handleUpdate = async (skillId: string, status: SkillStatus) => {
    setIsUpdating(true);
    setError(null);
    const res = await upsertStudentSkill(studentId, skillId, status);
    if (res.error) {
      setError(res.error);
    } else {
      // revalidatePath() inside the action invalidates the server cache but
      // doesn't re-render this already-mounted client page — studentSkills
      // is a static prop from the initial load, not a live query. Without
      // this, an assignment saves to the DB but never appears on screen
      // until a manual reload.
      router.refresh();
    }
    setIsUpdating(false);
  };

  return (
    <Card>
      <CardHeader eyebrow={t('detailSkillsEyebrow')} title={t('detailSkillsTitle')} />
      <div style={{ padding: '0 22px 4px', marginTop: 16 }}>
        <p
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 13,
            color: 'var(--ink-3)',
            marginBottom: 14,
          }}
        >
          {t('detailSkillsIntro')}
        </p>
        <LevelTabs
          skillsByLevel={skillsByLevel}
          studentSkills={studentSkills}
          activeLevel={activeLevel}
          onSelect={setActiveLevel}
        />
      </div>

      {activeSkills.length === 0 ? (
        <Empty>{t('skillsEmptyLevel')}</Empty>
      ) : (
        <SkillsChecklistLevel
          skills={activeSkills}
          studentSkills={studentSkills}
          canEdit={canEdit}
          isUpdating={isUpdating}
          onUpdate={handleUpdate}
          level={activeLevel}
        />
      )}

      <ErrorNote message={error} />
    </Card>
  );
};
