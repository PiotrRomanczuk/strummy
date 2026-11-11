/**
 * Page-level role gates. RLS already scopes the data on these pages; the gate
 * keeps a role from landing on a surface that is not meant for it.
 */
import AIHistoryPage from '@/app/dashboard/ai/history/page';
import ChordQuizPage from '@/app/dashboard/skills/chord-quiz/page';
import LessonPage from '@/app/dashboard/theory/[courseId]/[lessonId]/page';

const mockRoles = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockRoles(),
}));

const mockGetTheoryLesson = jest.fn();
jest.mock('@/app/dashboard/theory/actions', () => ({
  getTheoryLesson: (...args: unknown[]) => mockGetTheoryLesson(...args),
  getTheoryCourse: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

jest.mock('@/components/ai/AIGenerationHistory', () => ({ AIGenerationHistory: () => null }));
jest.mock('@/components/skills/chord-quiz', () => ({ ChordQuiz: () => null }));
jest.mock('@/components/theory', () => ({ ChapterReader: () => null }));
jest.mock('@/app/actions/chord-srs', () => ({ getDueChordIds: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/services/chord-quiz-stats-queries', () => ({
  getChordQuizStats: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const roles = (flags: Record<string, boolean>) => ({
  user: { id: 'u1' },
  profileId: 'p1',
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isParent: false,
  ...flags,
});
const signedOut = { user: null, profileId: null };

const openHistory = () => AIHistoryPage();
const openQuiz = () => ChordQuizPage({ searchParams: Promise.resolve({}) });
const openLesson = () =>
  LessonPage({ params: Promise.resolve({ courseId: 'c1', lessonId: 'l1' }) });

beforeEach(() => {
  jest.clearAllMocks();
  mockGetTheoryLesson.mockResolvedValue(null);
});

describe('AI history', () => {
  it('sends a signed-out visitor to sign-in', async () => {
    mockRoles.mockResolvedValue(signedOut);
    await expect(openHistory()).rejects.toThrow('REDIRECT:/sign-in?redirect=/dashboard/ai/history');
  });

  it('sends a student back to the dashboard', async () => {
    mockRoles.mockResolvedValue(roles({ isStudent: true }));
    await expect(openHistory()).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('opens for a teacher', async () => {
    mockRoles.mockResolvedValue(roles({ isTeacher: true }));
    await expect(openHistory()).resolves.toBeTruthy();
  });
});

describe.each([
  ['chord quiz', openQuiz, '/dashboard/skills/chord-quiz'],
  ['theory reader', openLesson, '/dashboard/theory/c1/l1'],
])('%s', (_name, open, path) => {
  it('sends a signed-out visitor to sign-in', async () => {
    mockRoles.mockResolvedValue(signedOut);
    await expect(open()).rejects.toThrow(`REDIRECT:/sign-in?redirect=${path}`);
  });

  it('sends a parent-only account back to the dashboard', async () => {
    mockRoles.mockResolvedValue(roles({ isParent: true }));
    await expect(open()).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('does not redirect a student', async () => {
    mockRoles.mockResolvedValue(roles({ isStudent: true }));
    const outcome = await open().catch((error: Error) => error.message);
    expect(String(outcome)).not.toContain('REDIRECT');
  });
});
