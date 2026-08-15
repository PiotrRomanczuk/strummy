'use client';

import { useTranslations } from 'next-intl';

import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import { SKILL_LEVELS, type SkillLevel } from '@/types/StudentSkills';
import { countMastered } from './skills-checklist.helpers';

const levelLabelKey = (level: SkillLevel): string =>
  `skillLevel${level[0].toUpperCase()}${level.slice(1)}`;

/**
 * Level selector, with a mastered/total tally per tab.
 *
 * The tally counts against the FULL catalog for that level even in the
 * student's filtered view — it is the honest denominator, and the one the
 * lesson progress bars below already use.
 */
export const LevelTabs = ({
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

export const ErrorNote = ({ message }: { message: string | null }) => {
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
