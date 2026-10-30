/**
 * Contract: what the UI sends to a streaming action reaches the model.
 *
 * Runs the real agent specs on purpose. The stream tests that stub the registry
 * could not see the failure this guards: five actions passed camelCase keys,
 * buildUserMessage only reads `allowedFields`, and the model received
 * "No specific input provided." on every production call.
 *
 * @see app/actions/ai/shared.ts executeAgentStream
 * @see lib/ai/registry/validation.ts validateRequest
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  generateAdminInsightsStream,
  generateAssignmentStream,
  generateEmailDraftStream,
  generateLessonNotesStream,
  analyzeStudentProgressStream,
} from '../ai';
import { executeAgentStream } from '../ai/shared';
import { registerAllAgents } from '@/lib/ai/agents';

const mockComplete = jest.fn();
const mockProvider = {
  name: 'OpenRouter',
  isAvailable: jest.fn().mockResolvedValue(true),
  listModels: jest.fn().mockResolvedValue([]),
  complete: mockComplete,
};

jest.mock('@/lib/ai', () => ({
  getAIProvider: () => Promise.resolve(mockProvider),
  isAIError: (e: any) => e?.isAIError === true,
}));

jest.mock('@/lib/ai/provider-factory', () => ({
  ...jest.requireActual('@/lib/ai/provider-factory'),
  getProviderFor: () => Promise.resolve(mockProvider),
}));

jest.mock('@/lib/ai/registry', () => ({
  ...jest.requireActual('@/lib/ai/registry'),
  prepareContext: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn(() => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'p1' } }) }) }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      })),
    })
  ),
}));

const mockRequireAIAuth = jest.fn();
jest.mock('@/lib/ai/auth', () => ({ requireAIAuth: () => mockRequireAIAuth() }));

jest.mock('@/lib/ai/rate-limiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
}));

jest.mock('@/lib/ai/agent-execution', () => ({
  generateLessonNotesAgent: jest.fn(),
  generateAssignmentAgent: jest.fn(),
  generateEmailDraftAgent: jest.fn(),
  generatePostLessonSummaryAgent: jest.fn(),
  analyzeStudentProgressAgent: jest.fn(),
  generateAdminInsightsAgent: jest.fn(),
  extractAgentResult: jest.fn(),
  formatAgentError: jest.fn(),
  isAgentSuccess: jest.fn(),
}));

jest.mock('../ai-conversations', () => ({
  getConversation: jest.fn(),
  saveConversationMessages: jest.fn().mockResolvedValue(undefined),
  trackAIUsage: jest.fn().mockResolvedValue(undefined),
}));

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

function sentUserMessage(): string {
  const request = mockComplete.mock.calls[0][0];
  return request.messages.find((m: any) => m.role === 'user').content;
}

function signInAs(role: 'admin' | 'teacher' | 'student') {
  mockRequireAIAuth.mockResolvedValue({
    id: 'u1',
    profileId: 'p1',
    role,
    email: 't@example.com',
  });
}

beforeAll(() => {
  registerAllAgents();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockComplete.mockResolvedValue({ content: 'ok' });
  signInAs('admin');
});

describe('streaming actions deliver their input to the model', () => {
  const cases = [
    {
      name: 'assignment-generator',
      run: () =>
        generateAssignmentStream({
          studentName: 'Ania',
          studentId: 'student-1',
          skillLevel: 'beginner',
          focusArea: 'Zmiany akordów',
          timeAvailable: '2 tygodnie',
          recentSongs: ['Wonderwall', 'Knockin on Heavens Door'],
          lessonTopic: 'Rytm',
        }),
      expected: [
        'student_name: Ania',
        'student_level: beginner',
        'assignment_focus: Zmiany akordów',
        'duration_weeks: 2 tygodnie',
        'song_title: Wonderwall, Knockin on Heavens Door',
        'specific_techniques: Rytm',
      ],
    },
    {
      name: 'lesson-notes-assistant',
      run: () =>
        generateLessonNotesStream({
          studentName: 'Ania',
          studentId: 'student-1',
          songTitle: 'Wonderwall',
          lessonFocus: 'Bicie',
          skillsWorked: 'Zmiany G-D',
          nextSteps: 'Metronom',
        }),
      expected: [
        'student_name: Ania',
        'songs_covered: Wonderwall',
        'lesson_topic: Bicie',
        'techniques_practiced: Zmiany G-D',
        'next_lesson_goals: Metronom',
      ],
    },
    {
      name: 'student-progress-insights',
      run: () =>
        analyzeStudentProgressStream({ studentId: 'student-1', timePeriod: 'Last 30 days' }),
      expected: [
        'student_ids: ["student-1"]',
        'time_period: Last 30 days',
        'analysis_focus: individual_progress',
      ],
    },
    {
      name: 'admin-dashboard-insights',
      run: () =>
        generateAdminInsightsStream({
          totalUsers: 12,
          totalStudents: 9,
          totalTeachers: 1,
          totalLessons: 105,
          recentUsers: 2,
          timeframe: 'last_30_days',
        }),
      expected: [
        'total_users: 12',
        'total_students: 9',
        'total_teachers: 1',
        'total_lessons: 105',
        'recent_users: 2',
        'analysis_period: last_30_days',
      ],
    },
    {
      name: 'email-draft-generator',
      run: () =>
        generateEmailDraftStream({
          template_type: 'lesson_reminder',
          student_name: 'Ania',
          studentId: 'student-1',
          details: {
            lesson_date: '2026-11-03',
            lesson_time: '17:30',
            practice_songs: 'Wonderwall',
          },
        }),
      expected: [
        'template_type: lesson_reminder',
        'student_name: Ania',
        'lesson_date: 2026-11-03',
        'lesson_time: 17:30',
        'practice_songs: Wonderwall',
      ],
    },
  ];

  it.each(cases)('$name', async ({ run, expected }) => {
    await collect(run() as AsyncGenerator<string>);

    expect(mockComplete).toHaveBeenCalledTimes(1);
    const message = sentUserMessage();
    expect(message).not.toContain('No specific input provided.');
    for (const line of expected) expect(message).toContain(line);
  });
});

describe('executeAgentStream enforces the agent contract', () => {
  it('rejects a field the agent does not declare instead of dropping it', async () => {
    const chunks = await collect(
      executeAgentStream('lesson-notes-assistant', {
        studentName: 'Ania',
      }) as AsyncGenerator<string>
    );

    expect(chunks.join('')).toContain("Input field 'studentName' is not allowed");
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('refuses a role the agent does not target', async () => {
    signInAs('student');

    const chunks = await collect(
      generateAdminInsightsStream({
        totalUsers: 1,
        totalStudents: 1,
        totalTeachers: 1,
        totalLessons: 1,
      }) as AsyncGenerator<string>
    );

    expect(chunks.join('')).toContain("User role 'student' not permitted");
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('masks e-mail addresses for agents in sanitize mode', async () => {
    await collect(
      generateEmailDraftStream({
        template_type: 'lesson_reminder',
        student_name: 'ania.kowalska@example.com',
      }) as AsyncGenerator<string>
    );

    expect(sentUserMessage()).toContain('student_name: a***@example.com');
  });
});
