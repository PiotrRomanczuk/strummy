import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import type { SkillStatus } from '@/types/StudentSkills';
import {
  assessedSkills,
  firstAssessedLevel,
  groupSkillsByLesson,
  isMilestoneLesson,
  lessonProgress,
} from './skills-checklist.helpers';

/**
 * The roadmap helpers had no unit test at all until 2026-08-15 — they were
 * covered only indirectly, through the roadmap E2E. `lessonProgress` is the one
 * that matters: its two-definition rule is a deliberate asymmetry that reads
 * like a bug, so it is exactly the kind of thing a well-meaning refactor
 * "simplifies" away. These tests exist to make that refactor fail loudly.
 *
 * Note `tsconfig.json` excludes `*.test.ts` from `npm run typecheck`, so these
 * factories are NOT type-checked — every required field is spelled out by hand
 * (the older factory in SkillsChecklist.test.tsx silently omits `lesson_group`).
 */
const skill = (overrides: Partial<Skill> = {}): Skill => ({
  id: 'skill-1',
  name: 'Test Skill',
  category: 'Chords',
  description: null,
  level: 'beginner',
  lesson_group: null,
  created_at: null,
  updated_at: null,
  ...overrides,
});

const assessment = (skillId: string, status: SkillStatus): StudentSkill =>
  ({
    id: `ss-${skillId}`,
    student_id: 'student-1',
    skill_id: skillId,
    status,
    notes: null,
    last_assessed_at: null,
    created_at: null,
    updated_at: null,
    skill: skill({ id: skillId }),
  }) as StudentSkill;

describe('groupSkillsByLesson', () => {
  it('orders lessons ascending regardless of input order', () => {
    const groups = groupSkillsByLesson([
      skill({ id: 'c', lesson_group: 3 }),
      skill({ id: 'a', lesson_group: 1 }),
      skill({ id: 'b', lesson_group: 2 }),
    ]);

    expect(groups.map((g) => g.lessonNumber)).toEqual([1, 2, 3]);
  });

  it('puts the ungrouped catch-all last, after every numbered lesson', () => {
    const groups = groupSkillsByLesson([
      skill({ id: 'loose', lesson_group: null }),
      skill({ id: 'a', lesson_group: 2 }),
      skill({ id: 'b', lesson_group: 1 }),
    ]);

    expect(groups.map((g) => g.lessonNumber)).toEqual([1, 2, null]);
  });

  it('omits the catch-all entirely when every skill is mapped', () => {
    const groups = groupSkillsByLesson([
      skill({ id: 'a', lesson_group: 1 }),
      skill({ id: 'b', lesson_group: 1 }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].skills.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('returns a single unheaded bucket when nothing is mapped', () => {
    const groups = groupSkillsByLesson([skill({ id: 'a' }), skill({ id: 'b' })]);

    expect(groups).toEqual([{ lessonNumber: null, skills: expect.any(Array) }]);
    expect(groups[0].skills).toHaveLength(2);
  });

  it('returns nothing for no skills', () => {
    expect(groupSkillsByLesson([])).toEqual([]);
  });
});

describe('isMilestoneLesson', () => {
  it.each([
    ['beginner', 11, true],
    ['beginner', 10, false],
    ['intermediate', 16, true],
    ['intermediate', 11, false],
    // Advanced has no roadmap designed yet, so nothing in it is a milestone.
    ['advanced', 16, false],
  ] as const)('(%s, %s) → %s', (level, lesson, expected) => {
    expect(isMilestoneLesson(level, lesson)).toBe(expected);
  });

  it('is never a milestone for the ungrouped bucket', () => {
    expect(isMilestoneLesson('beginner', null)).toBe(false);
  });
});

describe('lessonProgress', () => {
  // The asymmetry, pinned. From the helper's own comment: the text label counts
  // `mastered` only so it matches the level tab, while the BAR gives
  // `proficient` half credit — a visual cue that a lesson is coming along
  // before everything in it is fully mastered. Two numbers, on purpose.
  it('counts only mastered in the label but gives proficient half a bar', () => {
    const skills = [skill({ id: 'a' }), skill({ id: 'b' })];
    const assessed = [assessment('a', 'mastered'), assessment('b', 'proficient')];

    expect(lessonProgress(skills, assessed)).toEqual({
      masteredCount: 1,
      total: 2,
      pct: 75,
    });
  });

  it('never lets proficient alone increment the mastered count', () => {
    const skills = [skill({ id: 'a' }), skill({ id: 'b' })];
    const assessed = [assessment('a', 'proficient'), assessment('b', 'proficient')];

    expect(lessonProgress(skills, assessed)).toMatchObject({ masteredCount: 0, pct: 50 });
  });

  it.each(['developing', 'progressing'] as const)('scores %s as zero', (status) => {
    const skills = [skill({ id: 'a' })];

    expect(lessonProgress(skills, [assessment('a', status)])).toEqual({
      masteredCount: 0,
      total: 1,
      pct: 0,
    });
  });

  it('treats a missing assessment as zero, not as an error', () => {
    expect(lessonProgress([skill({ id: 'a' })], [])).toEqual({
      masteredCount: 0,
      total: 1,
      pct: 0,
    });
  });

  it('rounds the bar rather than emitting a fraction', () => {
    const skills = [skill({ id: 'a' }), skill({ id: 'b' }), skill({ id: 'c' })];

    expect(lessonProgress(skills, [assessment('a', 'mastered')]).pct).toBe(33);
  });

  it('reports 0% for an empty lesson instead of dividing by zero', () => {
    expect(lessonProgress([], [])).toEqual({ masteredCount: 0, total: 0, pct: 0 });
  });

  it('counts the full lesson as the denominator even when only some are assessed', () => {
    // This is what keeps the student's filtered view honest: two visible rows,
    // both mastered, still read "2/3" because the third skill exists.
    const skills = [skill({ id: 'a' }), skill({ id: 'b' }), skill({ id: 'c' })];
    const assessed = [assessment('a', 'mastered'), assessment('b', 'mastered')];

    expect(lessonProgress(skills, assessed)).toMatchObject({ masteredCount: 2, total: 3 });
  });
});

describe('assessedSkills', () => {
  it('keeps only skills the teacher has actually assessed', () => {
    const skills = [skill({ id: 'a' }), skill({ id: 'b' }), skill({ id: 'c' })];

    const kept = assessedSkills(skills, [
      assessment('a', 'developing'),
      assessment('c', 'mastered'),
    ]);

    expect(kept.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('keeps a skill at any status, not just mastered', () => {
    const skills = [skill({ id: 'a' })];

    expect(assessedSkills(skills, [assessment('a', 'developing')])).toHaveLength(1);
  });

  it('returns nothing when nothing is assessed', () => {
    expect(assessedSkills([skill({ id: 'a' })], [])).toEqual([]);
  });
});

describe('firstAssessedLevel', () => {
  it('opens on the first level that has any assessment', () => {
    const skills = [
      skill({ id: 'a', level: 'beginner' }),
      skill({ id: 'b', level: 'intermediate' }),
    ];

    expect(firstAssessedLevel(skills, [assessment('b', 'progressing')])).toBe('intermediate');
  });

  it('prefers the earliest level when several are assessed', () => {
    const skills = [
      skill({ id: 'a', level: 'intermediate' }),
      skill({ id: 'b', level: 'beginner' }),
    ];
    const assessed = [assessment('a', 'mastered'), assessment('b', 'developing')];

    expect(firstAssessedLevel(skills, assessed)).toBe('beginner');
  });

  it('falls back to beginner when nothing is assessed', () => {
    // A student in this state sees the empty state, not a tab — the fallback
    // only has to be harmless.
    expect(firstAssessedLevel([skill({ id: 'a', level: 'advanced' })], [])).toBe('beginner');
  });
});
