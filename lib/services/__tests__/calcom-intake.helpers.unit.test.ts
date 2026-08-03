import { extractIntakeAnswers, resolveStudentId } from '../calcom-intake.helpers';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

function responsesOf(answers: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(answers).map(([identifier, value]) => [identifier, { value }])
  );
}

describe('extractIntakeAnswers', () => {
  it('returns all-null defaults when no responses are present', () => {
    expect(extractIntakeAnswers(undefined)).toEqual({
      isForChild: false,
      age: null,
      hasOwnInstrument: null,
      skillLevel: null,
    });
  });

  it('maps the four Gitara-lekcja answers onto intake fields', () => {
    const responses = responsesOf({
      student_or_child: 'Swoje dziecko',
      student_age: 8,
      has_own_instrument: 'Nie',
      guitar_skill_level: 'Zaczynam od zera',
    });

    expect(extractIntakeAnswers(responses)).toEqual({
      isForChild: true,
      age: 8,
      hasOwnInstrument: false,
      skillLevel: 'beginner',
    });
  });

  it.each([
    ['Zaczynam od zera', 'beginner'],
    ['Podstawowy', 'novice'],
    ['Średniozaawansowany', 'intermediate'],
    ['Zaawansowany', 'advanced'],
  ])('maps skill answer %s to %s', (answer, expected) => {
    const responses = responsesOf({ guitar_skill_level: answer });
    expect(extractIntakeAnswers(responses).skillLevel).toBe(expected);
  });

  it('treats "Siebie" as not-for-child', () => {
    const responses = responsesOf({ student_or_child: 'Siebie' });
    expect(extractIntakeAnswers(responses).isForChild).toBe(false);
  });
});

describe('resolveStudentId', () => {
  const mockSupabase = { from: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  it('creates a parent profile and a child profile when booking for a child', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValueOnce({ data: null }) // parent lookup: no match
        .mockResolvedValueOnce({ data: null }), // child lookup: no match
      single: jest
        .fn()
        .mockResolvedValueOnce({ data: { id: 'parent_1' }, error: null }) // parent insert
        .mockResolvedValueOnce({ data: { id: 'child_1' }, error: null }), // child insert
    };
    mockSupabase.from.mockReturnValue(chain);

    const intake = {
      isForChild: true,
      age: 8,
      hasOwnInstrument: false,
      skillLevel: 'beginner',
    };
    const attendee = {
      name: 'Jan Kowalski',
      email: 'jan@example.com',
      phoneNumber: '+48111222333',
    };

    const studentId = await resolveStudentId(
      mockSupabase as never,
      attendee,
      'jan@example.com',
      intake
    );

    expect(studentId).toBe('child_1');
    expect(chain.insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ full_name: 'Jan Kowalski', is_parent: true })
    );
    expect(chain.insert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        parent_id: 'parent_1',
        skill_level: 'beginner',
        has_own_instrument: false,
        notes: expect.stringContaining('8'),
      })
    );
  });

  it('reuses an existing child instead of creating a duplicate', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValueOnce({ data: { id: 'parent_1', is_parent: true } })
        .mockResolvedValueOnce({ data: { id: 'existing_child' } }),
    };
    mockSupabase.from.mockReturnValue(chain);

    const intake = { isForChild: true, age: null, hasOwnInstrument: null, skillLevel: null };
    const studentId = await resolveStudentId(
      mockSupabase as never,
      { name: 'Jan Kowalski', email: 'jan@example.com' },
      'jan@example.com',
      intake
    );

    expect(studentId).toBe('existing_child');
  });

  it('never overwrites an existing matched profile with booking-form answers', async () => {
    const profileChain = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'existing_1' } }),
    };
    mockSupabase.from.mockReturnValue(profileChain);

    const intake = { isForChild: false, age: 30, hasOwnInstrument: true, skillLevel: 'advanced' };
    const studentId = await resolveStudentId(
      mockSupabase as never,
      { name: 'Alex', email: 'alex@example.com' },
      'alex@example.com',
      intake
    );

    expect(studentId).toBe('existing_1');
  });
});
