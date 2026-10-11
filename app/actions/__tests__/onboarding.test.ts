/**
 * saveOnboarding — the role-assignment boundary.
 *
 * Onboarding is the only place a user picks their own role, so it must only
 * work for a profile that has no role yet. Everything else (preferences,
 * teacher settings) is incidental here.
 *
 * @see app/actions/onboarding.ts
 */

import { saveOnboarding } from '../onboarding';
import type { OnboardingSavePayload } from '@/types/onboarding';

jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: jest.fn(() => Promise.resolve({ isDevelopment: false })),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetUser = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve({ auth: { getUser: mockGetUser } })),
}));

const mockMaybeSingle = jest.fn();
const mockUpdateEq = jest.fn();
const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));
const mockUpsert = jest.fn(() => Promise.resolve({ error: null }));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: mockMaybeSingle })) })),
      update: mockUpdate,
      upsert: mockUpsert,
    })),
  })),
}));

const teacherPayload: OnboardingSavePayload = {
  role: 'teacher',
  teacher: {
    displayName: 'Mallory',
    instrument: 'Guitar',
    yearsExperience: '3',
    studioName: '',
    tagline: '',
    city: '',
    timezone: 'Europe/Warsaw',
    teaches: [],
    defaultLessonMinutes: 45,
    inviteEmails: '',
    guitars: [],
  },
};

const authedUser = { id: 'auth-1', email: 'm@example.com', user_metadata: {} };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: authedUser }, error: null });
  mockUpdateEq.mockResolvedValue({ error: null });
});

describe('saveOnboarding', () => {
  it('rejects an unauthenticated caller', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });
    await expect(saveOnboarding(teacherPayload)).resolves.toEqual({ error: 'Unauthorized' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it.each([
    [
      'student',
      { is_student: true, is_teacher: false, is_admin: false, onboarding_completed: true },
    ],
    [
      'teacher',
      { is_student: false, is_teacher: true, is_admin: false, onboarding_completed: true },
    ],
    [
      'admin',
      { is_student: false, is_teacher: false, is_admin: true, onboarding_completed: false },
    ],
  ])('refuses to change the role of a profile that is already a %s', async (_role, flags) => {
    mockMaybeSingle.mockResolvedValue({ data: { id: 'profile-1', ...flags }, error: null });

    const result = await saveOnboarding(teacherPayload);

    expect(result).toEqual({ error: 'Onboarding is already complete for this account' });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('refuses a teacher request from an invited student who has not onboarded', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'profile-1',
        is_student: true,
        is_teacher: false,
        is_admin: false,
        onboarding_completed: false,
      },
      error: null,
    });
    const result = await saveOnboarding(teacherPayload);
    expect(result).toEqual({ error: 'Onboarding is already complete for this account' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('lets an invited student save the journey once without touching the role flags', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'profile-1',
        is_student: true,
        is_teacher: false,
        is_admin: false,
        onboarding_completed: false,
      },
      error: null,
    });
    const result = await saveOnboarding({
      role: 'student',
      student: { skillLevel: 'novice', goals: ['classics'], dailyGoalMinutes: 15, guitars: [] },
    });
    expect(result).toEqual({ ok: true });
    const written = (mockUpdate.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(written).toMatchObject({ skill_level: 'novice', onboarding_completed: true });
    expect(written).not.toHaveProperty('is_teacher');
    expect(written).not.toHaveProperty('is_student');
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('assigns the chosen role to a profile that has none yet', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'profile-1',
        is_student: false,
        is_teacher: false,
        is_admin: false,
        onboarding_completed: false,
      },
      error: null,
    });

    const result = await saveOnboarding(teacherPayload);

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ is_teacher: true, is_student: false, onboarding_completed: true })
    );
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'profile-1');
  });
});
