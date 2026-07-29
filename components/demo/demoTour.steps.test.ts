import { getTourSteps, tourStorageKey } from './demoTour.steps';

describe('demoTour.steps', () => {
  it.each(['teacher', 'student'] as const)('%s tour has 3+ steps with unique selectors', (role) => {
    const steps = getTourSteps(role);
    expect(steps.length).toBeGreaterThanOrEqual(3);
    const selectors = steps.map((s) => s.selector);
    expect(new Set(selectors).size).toBe(selectors.length);
    for (const step of steps) {
      expect(step.title).not.toHaveLength(0);
      expect(step.description).not.toHaveLength(0);
    }
  });

  it('starts both tours on the page body, not a nav item', () => {
    expect(getTourSteps('teacher')[0].selector).toBe('main');
    expect(getTourSteps('student')[0].selector).toBe('main');
  });

  it('storage keys are versioned and role-scoped', () => {
    expect(tourStorageKey('teacher')).not.toBe(tourStorageKey('student'));
    expect(tourStorageKey('teacher')).toMatch(/v1/);
  });
});
