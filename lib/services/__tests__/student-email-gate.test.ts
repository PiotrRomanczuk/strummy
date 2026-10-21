import { isStudentEmailEnabled } from '../student-email-gate';

describe('isStudentEmailEnabled', () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env };
    delete process.env.STUDENT_EMAILS_ENABLED;
    delete process.env.STUDENT_EMAIL_TYPES;
  });
  afterAll(() => {
    process.env = env;
  });

  it('blocks student e-mail by default', () => {
    expect(isStudentEmailEnabled('lesson_recap')).toBe(false);
  });

  it('lets everything through with STUDENT_EMAILS_ENABLED=true', () => {
    process.env.STUDENT_EMAILS_ENABLED = 'true';
    expect(isStudentEmailEnabled('assignment_due_reminder')).toBe(true);
  });

  it('lets only the listed types through with STUDENT_EMAIL_TYPES', () => {
    process.env.STUDENT_EMAIL_TYPES = 'lesson_recap, milestone_reached';
    expect(isStudentEmailEnabled('lesson_recap')).toBe(true);
    expect(isStudentEmailEnabled('assignment_due_reminder')).toBe(false);
  });
});
