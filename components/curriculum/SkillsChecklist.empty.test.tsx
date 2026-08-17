/**
 * Empty-state rendering for the student's checklist.
 *
 * These live at unit level on purpose. The E2E version of the
 * "no assessments at all" case had to delete every `student_skills` row for the
 * shared dev student, and Playwright runs spec FILES in parallel — so it raced
 * `student-skills-roadmap.spec.ts`, which reads the same student. That showed
 * up as a red-then-green-on-retry failure on CI run 31896924565.
 *
 * The states are pure presentation given props, so nothing is lost by testing
 * them here — and here they are deterministic.
 */
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import enMessages from '@/messages/en.json';
import { renderWithIntl } from '@/lib/testing/intl-test-utils';
import type { Skill, StudentSkill } from '@/app/actions/student-skills';
import { SkillsChecklist } from './SkillsChecklist';

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

const STUDENT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';

const skill = (overrides: Partial<Skill> = {}): Skill => ({
  id: 'skill-1',
  name: 'Open chords',
  category: 'Chords',
  description: null,
  level: 'beginner',
  lesson_group: 1,
  created_at: null,
  updated_at: null,
  ...overrides,
});

const assessment = (skillId: string): StudentSkill =>
  ({
    id: `ss-${skillId}`,
    student_id: STUDENT_ID,
    skill_id: skillId,
    status: 'mastered',
    notes: null,
    last_assessed_at: null,
    created_at: null,
    updated_at: null,
    skill: skill({ id: skillId }),
  }) as StudentSkill;

const t = enMessages.Users;

const renderStudent = (availableSkills: Skill[], studentSkills: StudentSkill[]) =>
  renderWithIntl(
    <SkillsChecklist
      studentId={STUDENT_ID}
      studentSkills={studentSkills}
      availableSkills={availableSkills}
      canEdit={false}
      variant="student"
      assessedOnly
    />
  );

describe('student checklist — nothing assessed at all', () => {
  it('shows the "not recorded yet" copy instead of the catalog', () => {
    renderStudent([skill({ id: 'a' }), skill({ id: 'b', name: 'Barre chords' })], []);

    expect(screen.getByText(t.skillsEmptyStudent)).toBeInTheDocument();
    // The catalog must not leak through: ~79 rows of "not started" is the
    // discouraging wall this variant exists to avoid.
    expect(screen.queryByText('Open chords')).not.toBeInTheDocument();
    expect(screen.queryByText('Barre chords')).not.toBeInTheDocument();
  });

  it('suppresses the level tabs, which would all read 0/N', () => {
    renderStudent([skill({ id: 'a' })], []);

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});

describe('student checklist — a level they have not reached', () => {
  it('explains the gap rather than rendering a blank panel', async () => {
    // Assessed at beginner, nothing at intermediate. Selecting intermediate
    // used to render an empty <div>: `activeSkills` was non-empty (the catalog
    // has entries there) so the "no skills catalogued" branch never fired, and
    // the assessed-only filter then removed every lesson.
    const skills = [
      skill({ id: 'a', level: 'beginner' }),
      skill({ id: 'b', level: 'intermediate', name: 'Thumb-over barre' }),
    ];

    renderStudent(skills, [assessment('a')]);

    // Opens on beginner, the first level with anything in it.
    expect(screen.getByText('Open chords')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Intermediate/i }));

    expect(screen.getByText(t.skillsEmptyLevelStudent)).toBeInTheDocument();
    // And never the catalog-flavoured wording, which is a claim about the
    // catalog and would be false to show a student.
    expect(screen.queryByText(t.skillsEmptyLevel)).not.toBeInTheDocument();
  });
});

describe('teacher variant is unaffected', () => {
  it('still shows the whole catalog when nothing is assessed', () => {
    renderWithIntl(
      <SkillsChecklist
        studentId={STUDENT_ID}
        studentSkills={[]}
        availableSkills={[skill({ id: 'a' })]}
        canEdit
      />
    );

    expect(screen.getByText('Open chords')).toBeInTheDocument();
    expect(screen.queryByText(t.skillsEmptyStudent)).not.toBeInTheDocument();
  });
});
