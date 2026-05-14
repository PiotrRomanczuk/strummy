/**
 * Post-Lesson Summary Agent Specification
 *
 * Guitar-specific agent for creating concise lesson summaries
 * with progress-tracking language, musical benchmarks, and assessment terminology.
 */

import type { AgentSpecification } from '../agent-registry';
import { MUSICAL_BENCHMARKS_BLOCK, ASSESSMENT_TERMINOLOGY_BLOCK } from './_shared/knowledge';

/**
 * Temperature 0.4 — summaries need accurate reporting of lesson facts with
 * warm tone. Moderate variance allows natural phrasing without hallucination.
 */
export const postLessonSummaryAgent: AgentSpecification = {
  id: 'post-lesson-summary',
  name: 'Post-Lesson Summary Generator',
  description: 'Creates concise summaries of lesson activities and student progress',
  version: '1.1.0',

  purpose:
    'Generate concise, informative lesson summaries that capture key achievements, areas worked on, and recommendations for continued practice, suitable for sharing with students and parents.',

  targetUsers: ['admin', 'teacher'],

  useCases: [
    'Create lesson summaries for student records',
    'Generate reports for parents and students',
    'Document lesson achievements and progress',
    'Provide practice recommendations post-lesson',
    'Track learning milestones and next steps',
  ],

  limitations: [
    'Based on teacher-provided information only',
    'Cannot capture nuanced in-lesson interactions',
    'Requires accurate input for meaningful output',
    'Does not replace detailed lesson notes',
  ],

  systemPrompt: `You are a guitar instructor creating concise lesson summaries for students and their families. You use clear musical benchmarks to communicate progress.

${MUSICAL_BENCHMARKS_BLOCK}

${ASSESSMENT_TERMINOLOGY_BLOCK}

SUMMARY PRINCIPLES:
- Lead with positive achievements and progress
- Use specific musical terminology (chord names, techniques, BPM)
- Frame challenges constructively ("Working toward clean barre chords" not "Can't play barre chords")
- Include 2-3 concrete practice recommendations with time estimates
- End with encouragement and preview of next lesson direction
- Keep parent-friendly: explain jargon briefly when needed`,

  model: 'meta-llama/llama-3.3-70b-instruct:free',
  temperature: 0.4,
  maxTokens: 500,
  fallbackTemplate:
    '## Post-Lesson Summary (AI Unavailable)\n\n**Student:** [name]\n**Date:** [date]\n\n### What We Worked On\n- \n\n### Achievements\n- \n\n### Areas for Improvement\n- \n\n*AI-generated summaries are temporarily unavailable.*',

  requiredContext: ['currentUser'],
  optionalContext: ['currentStudent', 'lessonDetails', 'studentLessons', 'studentRepertoire'],

  dataAccess: {
    tables: ['lessons', 'profiles'],
    permissions: ['read'],
  },

  inputValidation: {
    maxLength: 1200,
    allowedFields: [
      'student_name',
      'lesson_date',
      'songs_practiced',
      'techniques_covered',
      'achievements',
      'challenges',
      'practice_recommendations',
      'next_focus',
    ],
    sensitiveDataHandling: 'allow',
  },

  enableLogging: true,
  enableAnalytics: true,
  successMetrics: ['summaries_generated', 'parent_engagement', 'practice_follow_through'],

  uiConfig: {
    category: 'content',
    icon: 'FileEdit',
    placement: ['modal', 'inline'],
    loadingMessage: 'Summarizing lesson activities...',
    errorMessage: 'Could not create lesson summary. Please try again.',
  },
};
