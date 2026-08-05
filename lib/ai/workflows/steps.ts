/**
 * Step executors for explicit-state workflows (AIA-3).
 *
 * Each executor wraps an EXISTING agent from lib/ai/agents — the workflow
 * engine sequences agents, it does not replace the agent registry.
 */

// Import from the '@/lib/ai' barrel, not '../agent-execution' directly — the
// barrel is what runs registerAllAgents() as an import side effect. Bypassing
// it left the registry empty and every agent call failing AGENT_NOT_FOUND.
import {
  generatePostLessonSummaryAgent,
  generateAssignmentAgent,
  generateEmailDraftAgent,
  isAgentSuccess,
  formatAgentError,
  extractAgentResult,
} from '@/lib/ai';
import type { StepResult } from './types';

export type StepExecutor = (
  input: Record<string, unknown>,
  priorResults: Record<string, StepResult>
) => Promise<StepResult>;

function fromAgentResponse(
  response: Awaited<ReturnType<typeof generatePostLessonSummaryAgent>>
): StepResult {
  if (!isAgentSuccess(response)) {
    return { success: false, error: formatAgentError(response) };
  }
  const result = extractAgentResult(response) as Record<string, unknown>;
  return { success: true, content: String(result.content ?? result) };
}

async function runSummaryStep(input: Record<string, unknown>): Promise<StepResult> {
  const response = await generatePostLessonSummaryAgent({
    student_name: String(input.studentName ?? ''),
    // Not sent to the agent itself (post-lesson-summary's allowedFields
    // excludes it) — only used to resolve context.entityId, which is what
    // lets studentSkillProfile fire for this step.
    student_id: input.studentId as string | undefined,
    lesson_date: (input.lessonDate as string) ?? new Date().toLocaleDateString(),
    songs_practiced: (input.songsPracticed as string) ?? '',
    techniques_covered: (input.techniquesCovered as string) ?? '',
    achievements: (input.achievements as string) ?? '',
    challenges: (input.challenges as string) ?? '',
    practice_recommendations: (input.practiceRecommendations as string) ?? '',
    next_focus: (input.nextFocus as string) ?? '',
  });
  return fromAgentResponse(response);
}

// assignment-generator has a fixed, structured field set with no free-text
// "notes"/"context" field — unlike email-draft-generator, there is nowhere
// to inject the summary step's prose output. This step deliberately reads
// only the run's original input, not stepResults.
async function runAssignmentStep(input: Record<string, unknown>): Promise<StepResult> {
  const response = await generateAssignmentAgent({
    student_name: String(input.studentName ?? ''),
    // Not sent to the agent itself — see comment in runSummaryStep.
    student_id: input.studentId as string | undefined,
    student_level: (input.skillLevel as string) ?? 'beginner',
    song_title: input.songTitle as string | undefined,
    song_artist: input.songArtist as string | undefined,
    assignment_focus: (input.nextFocus as string) ?? '',
    duration_weeks: (input.durationWeeks as string) ?? '1',
    specific_techniques: (input.techniquesCovered as string) ?? '',
    difficulty_level: (input.difficultyLevel as string) ?? 'intermediate',
  });
  return fromAgentResponse(response);
}

// email-draft-generator DOES have a free-text `notes` field, so this is the
// one step that actually chains off the summary step's output.
async function runEmailStep(
  input: Record<string, unknown>,
  priorResults: Record<string, StepResult>
): Promise<StepResult> {
  const response = await generateEmailDraftAgent({
    template_type: 'progress_report',
    student_name: String(input.studentName ?? ''),
    student_id: input.studentId as string | undefined,
    practice_songs: (input.songsPracticed as string) ?? '',
    achievement: (input.achievements as string) ?? '',
    notes: priorResults.summary?.content ?? '',
  });
  return fromAgentResponse(response);
}

export const STEP_EXECUTORS: Record<string, StepExecutor> = {
  summary: runSummaryStep,
  assignment: runAssignmentStep,
  email: runEmailStep,
};
