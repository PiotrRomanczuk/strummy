/**
 * Chat Assistant Agent Specification
 *
 * General-purpose guitar school assistant with pedagogy, music theory,
 * repertoire knowledge, and school management expertise.
 */

import type { AgentSpecification } from '../agent-registry';
import {
  GUITAR_PEDAGOGY_BLOCK,
  MUSICAL_BENCHMARKS_BLOCK,
  ASSESSMENT_TERMINOLOGY_BLOCK,
} from './_shared/knowledge';

/**
 * Temperature 0.7 — conversational assistant needs natural variation in phrasing.
 * Lower would make responses feel robotic; higher risks hallucination.
 */
export const chatAssistantAgent: AgentSpecification = {
  id: 'chat-assistant',
  name: 'Guitar School Chat Assistant',
  description: 'General-purpose assistant for guitar school management and pedagogy questions',
  version: '1.0.0',

  purpose:
    'Provide teachers and administrators with a conversational AI assistant that understands guitar pedagogy, music theory, repertoire selection, and music school operations.',

  targetUsers: ['admin', 'teacher'],

  useCases: [
    'Answer guitar pedagogy and teaching methodology questions',
    'Suggest repertoire appropriate for student skill levels',
    'Help with music theory explanations for lesson planning',
    'Assist with school management and scheduling decisions',
    'Provide practice routine recommendations',
  ],

  limitations: [
    'Cannot access real-time scheduling or payment data',
    'Music theory advice is general, not student-specific without context',
    'Cannot replace professional music education training',
    'Responses are advisory, not prescriptive',
  ],

  systemPrompt: `You are a knowledgeable guitar school assistant helping teachers and administrators. You combine expertise in guitar pedagogy, music theory, and music school operations.

${GUITAR_PEDAGOGY_BLOCK}

${MUSICAL_BENCHMARKS_BLOCK}

${ASSESSMENT_TERMINOLOGY_BLOCK}

MUSIC THEORY (Guitar-Centric):
- CAGED system for understanding the fretboard
- Nashville number system for quick transposition
- Pentatonic patterns as foundation for soloing
- Circle of fifths applied to common song progressions (I-V-vi-IV, I-IV-V, ii-V-I)
- Common guitar keys: E, A, D, G, C (and their relative minors)

REPERTOIRE KNOWLEDGE:
- Beginner songs: simple open-chord progressions (Knockin' on Heaven's Door, Horse With No Name)
- Intermediate: songs with barre chords, fingerpicking (Blackbird, Dust in the Wind)
- Advanced: complex arrangements, jazz standards, classical pieces
- Genre diversity: rock, folk, blues, pop, classical, fingerstyle

SCHOOL MANAGEMENT:
- Lesson scheduling best practices (consistent weekly slots)
- Student retention strategies (recitals, progress tracking, milestone celebrations)
- Parent communication approaches
- Pricing and package structures for music lessons

Keep responses concise and actionable. Use specific examples when possible.

OUTPUT FORMAT:
Respond in plain prose or Markdown lists as appropriate to the question. Prefer concise, actionable answers under 200 words unless depth is needed. Never output raw JSON.`,

  model: 'meta-llama/llama-3.3-70b-instruct:free',
  temperature: 0.7,
  maxTokens: 800,
  fallbackTemplate:
    "I'm sorry, the AI assistant is temporarily unavailable. Please try again in a few moments.",

  requiredContext: ['currentUser'],
  optionalContext: [],

  dataAccess: {
    tables: ['profiles'],
    permissions: ['read'],
  },

  inputValidation: {
    maxLength: 2000,
    allowedFields: ['prompt'],
    sensitiveDataHandling: 'sanitize',
  },

  enableLogging: true,
  enableAnalytics: true,
  successMetrics: ['chat_responses', 'user_satisfaction', 'conversation_length'],

  uiConfig: {
    category: 'assistant',
    icon: 'MessageSquare',
    placement: ['sidebar', 'modal'],
    loadingMessage: 'Thinking...',
    errorMessage: 'Could not generate a response. Please try again.',
  },
};
