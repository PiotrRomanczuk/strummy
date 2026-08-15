/**
 * Individual Agent Execution Functions
 *
 * Type-safe wrapper functions for executing specific AI agents
 */

import { executeAgent, type AgentResponse } from '../agent-registry';
import { buildAgentContext } from './context';

// Email Draft Generator Execution
export async function generateEmailDraftAgent(input: {
  template_type:
    'lesson_reminder' | 'progress_report' | 'payment_reminder' | 'milestone_celebration';
  student_name: string;
  student_id?: string;
  lesson_date?: string;
  lesson_time?: string;
  practice_songs?: string;
  notes?: string;
  amount?: string;
  due_date?: string;
  achievement?: string;
}): Promise<AgentResponse> {
  const context = await buildAgentContext(input.student_id, 'student', {
    templateType: input.template_type,
  });

  return executeAgent('email-draft-generator', input, context);
}

// Lesson Notes Assistant Execution
export async function generateLessonNotesAgent(input: {
  student_name: string;
  student_id?: string;
  lesson_topic?: string;
  songs_covered?: string;
  techniques_practiced?: string;
  student_progress?: string;
  areas_to_focus?: string;
  homework_assigned?: string;
  next_lesson_goals?: string;
}): Promise<AgentResponse> {
  // student_id is used to resolve context.entityId, never sent to the agent
  // itself — lesson-notes-assistant's allowedFields doesn't include it, so
  // passing `input` through unmodified would fail input validation.
  const { student_id, ...agentInput } = input;
  const context = await buildAgentContext(student_id, 'student');

  return executeAgent('lesson-notes-assistant', agentInput, context);
}

// Assignment Generator Execution
export async function generateAssignmentAgent(input: {
  student_name: string;
  student_id?: string;
  student_level?: string;
  song_title?: string;
  song_artist?: string;
  assignment_focus?: string;
  duration_weeks?: string;
  specific_techniques?: string;
  difficulty_level?: string;
}): Promise<AgentResponse> {
  // student_id is used to resolve context.entityId, never sent to the agent
  // itself — assignment-generator's allowedFields doesn't include it, so
  // passing `input` through unmodified would fail input validation.
  const { student_id, ...agentInput } = input;
  const context = await buildAgentContext(student_id, 'student', {
    songInfo: {
      title: input.song_title,
      artist: input.song_artist,
    },
  });

  return executeAgent('assignment-generator', agentInput, context);
}

// Post-Lesson Summary Execution
export async function generatePostLessonSummaryAgent(input: {
  student_name: string;
  student_id?: string;
  lesson_date?: string;
  songs_practiced?: string;
  techniques_covered?: string;
  achievements?: string;
  challenges?: string;
  practice_recommendations?: string;
  next_focus?: string;
}): Promise<AgentResponse> {
  // student_id is used to resolve context.entityId, never sent to the agent
  // itself — post-lesson-summary's allowedFields doesn't include it, so
  // passing `input` through unmodified would fail input validation. This is
  // also why lib/ai/workflows/steps.ts never needed to pass it explicitly.
  const { student_id, ...agentInput } = input;
  const context = await buildAgentContext(student_id, 'student');

  return executeAgent('post-lesson-summary', agentInput, context);
}

// Student Progress Insights Execution
export async function analyzeStudentProgressAgent(input: {
  student_ids: string[];
  time_period?: string;
  analysis_focus?: string;
}): Promise<AgentResponse> {
  const context = await buildAgentContext(undefined, 'analysis', {
    analysisType: 'student_progress',
    timePeriod: input.time_period || '30_days',
  });

  return executeAgent('student-progress-insights', input, context);
}

// Admin Dashboard Insights Execution
export async function generateAdminInsightsAgent(input: {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_lessons: number;
  analysis_period?: string;
}): Promise<AgentResponse> {
  const context = await buildAgentContext(undefined, 'analysis', {
    analysisType: 'admin_dashboard',
    businessMetrics: true,
  });

  return executeAgent('admin-dashboard-insights', input, context);
}

// Chat Assistant Execution
export async function generateChatResponseAgent(input: {
  prompt: string;
  model?: string;
}): Promise<AgentResponse> {
  const context = await buildAgentContext(undefined, 'chat');

  return executeAgent('chat-assistant', input, context);
}
