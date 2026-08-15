import { groupSkillsByLevel, countMastered } from './skills-checklist.helpers';
import type { Skill, StudentSkill } from '@/app/actions/student-skills';

const skill = (overrides: Partial<Skill>): Skill => ({
  id: 'skill-1',
  name: 'Test Skill',
  category: 'Chords',
  description: null,
  level: 'beginner',
  // Required by `Skill` and silently omitted here until 2026-08-15: test files
  // are excluded from `npm run typecheck`, so the gap never surfaced.
  lesson_group: null,
  created_at: null,
  updated_at: null,
  ...overrides,
});

describe('groupSkillsByLevel', () => {
  it('buckets skills into beginner/intermediate/advanced', () => {
    const skills = [
      skill({ id: '1', level: 'beginner' }),
      skill({ id: '2', level: 'intermediate' }),
      skill({ id: '3', level: 'advanced' }),
      skill({ id: '4', level: 'beginner' }),
    ];

    const grouped = groupSkillsByLevel(skills);

    expect(grouped.get('beginner')?.map((s) => s.id)).toEqual(['1', '4']);
    expect(grouped.get('intermediate')?.map((s) => s.id)).toEqual(['2']);
    expect(grouped.get('advanced')?.map((s) => s.id)).toEqual(['3']);
  });

  it('drops skills with no level and never throws on an unknown value', () => {
    const skills = [skill({ id: '1', level: null }), skill({ id: '2', level: 'beginner' })];

    const grouped = groupSkillsByLevel(skills);

    expect(grouped.get('beginner')?.map((s) => s.id)).toEqual(['2']);
    expect([...grouped.values()].flat()).toHaveLength(1);
  });

  it('always returns all three level buckets, even when empty', () => {
    const grouped = groupSkillsByLevel([]);
    expect([...grouped.keys()]).toEqual(['beginner', 'intermediate', 'advanced']);
  });
});

describe('countMastered', () => {
  const studentSkill = (skillId: string, status: StudentSkill['status']): StudentSkill => ({
    id: `ss-${skillId}`,
    student_id: 'student-1',
    skill_id: skillId,
    status,
    notes: null,
    last_assessed_at: null,
    created_at: null,
    updated_at: null,
    skill: skill({ id: skillId }),
  });

  it('counts only skills whose student assessment is mastered', () => {
    const skills = [skill({ id: '1' }), skill({ id: '2' }), skill({ id: '3' })];
    const studentSkills = [
      studentSkill('1', 'mastered'),
      studentSkill('2', 'developing'),
      studentSkill('3', 'mastered'),
    ];

    expect(countMastered(skills, studentSkills)).toBe(2);
  });

  it('does not count skills with no student assessment yet', () => {
    const skills = [skill({ id: '1' })];
    expect(countMastered(skills, [])).toBe(0);
  });
});
