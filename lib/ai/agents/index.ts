/**
 * Agent Registry Index
 *
 * Central export point for all agent categories and registration
 */

import { registerAgent } from '../registry';

// Import agents by category
import { emailDraftAgent } from './communication';
import { lessonNotesAgent, assignmentGeneratorAgent, postLessonSummaryAgent } from './content';
import { progressInsightsAgent, adminInsightsAgent } from './analytics';
import { songNormalizationAgent } from './song-normalization';
import { chatAssistantAgent } from './chat';
import { songNotesAgent } from './song-notes';
import { songNotesEnhancerAgent } from './song-notes-enhancer';
import { songChordExtractionAgent } from './song-chord-extraction';
import { transcriptLessonDraftAgent } from './transcript-lesson-draft';

// Register all agents
export function registerAllAgents(): void {
  // Communication agents
  registerAgent(emailDraftAgent);

  // Content generation agents
  registerAgent(lessonNotesAgent);
  registerAgent(assignmentGeneratorAgent);
  registerAgent(postLessonSummaryAgent);

  // Analytics agents
  registerAgent(progressInsightsAgent);
  registerAgent(adminInsightsAgent);

  // System agents
  registerAgent(songNormalizationAgent);

  // Assistant agents
  registerAgent(chatAssistantAgent);

  // Song content agents
  registerAgent(songNotesAgent);
  registerAgent(songNotesEnhancerAgent);
  registerAgent(songChordExtractionAgent);

  // Lesson transcript agents
  registerAgent(transcriptLessonDraftAgent);

  // All agents registered
}

// Export all agent specifications for reference
export {
  // Communication
  emailDraftAgent,

  // Content
  lessonNotesAgent,
  assignmentGeneratorAgent,
  postLessonSummaryAgent,

  // Analytics
  progressInsightsAgent,
  adminInsightsAgent,

  // System
  songNormalizationAgent,

  // Assistant
  chatAssistantAgent,

  // Song content
  songNotesAgent,
  songNotesEnhancerAgent,
  songChordExtractionAgent,

  // Lesson transcripts
  transcriptLessonDraftAgent,
};

// Export agent categories for organized access
export const communicationAgents = {
  emailDraftAgent,
};

export const contentAgents = {
  lessonNotesAgent,
  assignmentGeneratorAgent,
  postLessonSummaryAgent,
};

export const analyticsAgents = {
  progressInsightsAgent,
  adminInsightsAgent,
};

// Export system agents for data processing
export const systemAgents = {
  songNormalizationAgent,
};

// Export assistant agents for chat
export const assistantAgents = {
  chatAssistantAgent,
};

// Export song content agents for the song create/edit forms
export const songContentAgents = {
  songNotesAgent,
  songNotesEnhancerAgent,
  songChordExtractionAgent,
};

// Export transcript agents for the lesson page
export const transcriptAgents = {
  transcriptLessonDraftAgent,
};
