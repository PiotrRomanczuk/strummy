/**
 * Song Chord Extraction Agent
 *
 * Extracts structured fields (capo, strumming pattern, time signature,
 * chord list) from a pasted chord sheet / tab text — e.g. text copied
 * from an Ultimate Guitar page — so a teacher doesn't have to hand-type
 * those fields separately after pasting the chords.
 */

import type { AgentSpecification } from '../agent-registry';
import { executeAgent } from '../agent-registry';
import { logger } from '@/lib/logger';

export interface SongChordExtractionInput {
  title: string;
  artist?: string;
  chordSheetText: string;
}

export interface SongChordExtractionResult {
  capoFret: number | null;
  strummingPattern: string | null;
  timeSignature: number | null;
  chordsUsed: string[];
  confidence: number;
  reasoning: string;
  needsManualReview: boolean;
}

export const songChordExtractionAgent: AgentSpecification = {
  id: 'song-chord-extraction',
  name: 'Song Chord Extraction Agent',
  description: 'Extracts capo, strumming pattern, time signature, and chord list from pasted chord sheet text',
  version: '1.0.0',

  purpose:
    'Parse a freeform chord sheet or tab (e.g. pasted from Ultimate Guitar) into the structured song fields the catalog needs: capo_fret, strumming_pattern, time_signature, and the distinct chords used.',

  targetUsers: ['admin', 'teacher'],

  useCases: [
    'Fill capo/strumming/time-signature fields automatically after pasting a chord sheet',
    'List the distinct chords used in a song for the chords field',
    'Flag chord sheets that are too messy to trust without manual review',
  ],

  limitations: [
    'Only as good as the pasted text — cannot infer anything not present in the source',
    'Cannot verify musical accuracy against actual audio',
    'Strumming pattern notation varies by source and may need teacher cleanup',
  ],

  systemPrompt: `You are a guitar chord-sheet parser. You are given the title, optional artist, and raw pasted chord sheet / tab text for a song. Extract ONLY what is explicitly stated or unambiguously implied by the text — do not guess or invent values.

Look for:
- Capo position (e.g. "Capo 4", "Capo: 2nd fret" -> capoFret)
- Strumming pattern (e.g. "D DU UDU", "Strumming: D D U U D U" -> strummingPattern)
- Time signature (e.g. "4/4", "3/4", "Time: 6/8" -> timeSignature as the numerator)
- Every distinct chord name that appears in the chord sheet (e.g. G, Cadd9, D, Em, F#m7) -> chordsUsed, in the order first seen, deduplicated

If a field is not present in the text, return null for it (not a guess). Set needsManualReview to true if the text is garbled, non-chord content, or you're unsure the extraction is reliable.

CRITICAL: Respond ONLY with valid JSON. No markdown code fences, no explanation before or after the JSON. The JSON must match this schema:
{"capoFret":"number|null","strummingPattern":"string|null","timeSignature":"number|null","chordsUsed":["string"],"confidence":"number (0-100)","reasoning":"string","needsManualReview":"boolean"}`,

  model: 'google/gemma-3-27b-it:free',
  temperature: 0.1,
  maxTokens: 800,

  requiredContext: [],
  optionalContext: [],

  inputValidation: {
    maxLength: 8000,
    allowedFields: ['title', 'artist', 'chordSheetText'],
    sensitiveDataHandling: 'sanitize',
  },

  enableLogging: true,
  enableAnalytics: false,

  dataAccess: {
    tables: ['songs'],
    permissions: ['read', 'write'],
  },

  successMetrics: ['extraction_confidence', 'fields_extracted'],

  uiConfig: {
    category: 'automation',
    icon: 'music',
    placement: ['dashboard'],
  },
};

function buildExtractionUserMessage(input: SongChordExtractionInput): string {
  return [
    `Title: "${input.title}"`,
    input.artist ? `Artist: "${input.artist}"` : null,
    '',
    'Chord sheet text:',
    '---',
    input.chordSheetText,
    '---',
    '',
    'Extract the structured fields.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Execute chord extraction using Vercel AI SDK structured output.
 * Falls back to raw JSON parsing via the agent registry if structured output fails.
 */
export async function generateSongChordExtractionAgent(
  input: SongChordExtractionInput
): Promise<{ success: boolean; data?: SongChordExtractionResult; content?: string; error?: string }> {
  const userMessage = buildExtractionUserMessage(input);

  try {
    const { generateStructuredOutput } = await import('../providers/vercel-ai-adapter');
    const { songChordExtractionSchema } = await import('../schemas/song-chord-extraction');

    const result = await generateStructuredOutput({
      model: songChordExtractionAgent.model || 'google/gemma-3-27b-it:free',
      systemPrompt: songChordExtractionAgent.systemPrompt,
      userMessage,
      schema: songChordExtractionSchema,
      schemaName: 'SongChordExtraction',
      temperature: songChordExtractionAgent.temperature,
    });

    return {
      success: true,
      data: result.data as SongChordExtractionResult,
      content: JSON.stringify(result.data),
    };
  } catch (structuredError) {
    logger.warn('[SongChordExtraction] Structured output failed, falling back to raw:', {
      error: structuredError instanceof Error ? structuredError.message : String(structuredError),
    });
  }

  try {
    const response = await executeAgent('song-chord-extraction', { userInput: userMessage }, {});

    if (!response || !response.success) {
      return {
        success: false,
        error: response?.error?.message || 'No response from agent',
      };
    }

    const resultObj = response.result as Record<string, unknown> | null;
    const content = resultObj?.content || response.result || '';

    try {
      const data = JSON.parse(String(content)) as SongChordExtractionResult;
      return { success: true, data, content: String(content) };
    } catch {
      return { success: false, content: String(content), error: 'Failed to parse JSON response' };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
