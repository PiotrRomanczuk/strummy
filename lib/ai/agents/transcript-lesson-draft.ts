/**
 * Transcript → lesson draft agent (CNT-6 / CNT-8).
 *
 * Reads a Flow transcript (summary + body) of one lesson and returns a
 * structured Polish draft: notes, songs mentioned, homework, next-lesson
 * pointers. Runs on the OpenRouter free tier (owner decision 2026-10-14);
 * names are stripped by the caller before anything is sent.
 */

import type { AgentSpecification } from '../agent-registry';
import {
  TranscriptDraftOutputSchema,
  toTranscriptDraft,
  type TranscriptDraft,
} from '../schemas/transcript-draft';

/**
 * Free-tier model that reliably honours `generateObject` (structured outputs
 * + response_format on OpenRouter). Verified with a real call on 2026-10-14.
 * No `:free` stripping — the free router is the whole point here.
 */
export const TRANSCRIPT_DRAFT_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';

/** Free models come and go — `TRANSCRIPT_DRAFT_MODEL` in the env swaps it without a deploy. */
export function resolveTranscriptDraftModel(): string {
  return process.env.TRANSCRIPT_DRAFT_MODEL?.trim() || TRANSCRIPT_DRAFT_MODEL;
}

export interface TranscriptLessonDraftInput {
  summary: string | null;
  body: string;
}

export const transcriptLessonDraftAgent: AgentSpecification = {
  id: 'transcript-lesson-draft',
  name: 'Transcript → Lesson Draft',
  description:
    'Turns a lesson recording transcript into reviewable Polish notes, songs and homework',
  version: '1.0.0',

  purpose:
    'Mine one lesson transcript for what was practised, which songs came up, what the student should do until next time — as a draft the teacher accepts item by item',

  targetUsers: ['teacher', 'admin'],

  useCases: [
    'Draft lesson notes from a recording',
    'List songs mentioned in a lesson with a suggested progress status',
    'Propose homework from what the teacher said to practise',
  ],

  limitations: [
    'Works on text only — no audio',
    'Speaker labels in transcripts are unreliable and are ignored',
    'Never writes to the lesson; the teacher accepts each item',
  ],

  systemPrompt: `Jesteś asystentem nauczyciela gitary. Dostajesz transkrypcję JEDNEJ lekcji (podsumowanie + pełny tekst) i zwracasz szkic do przeglądu przez nauczyciela. Odpowiadasz wyłącznie po polsku.

ZASADY:
- Etykiety mówców w transkrypcji (np. "Speaker 1", "Nauczyciel") NIE są wiarygodne — nie wnioskuj z nich, kto co powiedział. Kieruj się treścią.
- Pomijaj rozmowy towarzyskie, pogodę, osoby trzecie, sprawy niezwiązane z gitarą.
- Uczeń jest w transkrypcji nazwany "Uczeń". Nie używaj żadnych imion ani nazwisk w wyniku.

notes — notatki z lekcji w trzech listach krótkich punktów (bez nagłówków i bez myślników na początku):
practised ("Co ćwiczyliśmy") — ćwiczenia, techniki, fragmenty utworów; konkretnie: struny, progi, chwyty, tempo.
went_well ("Co poszło") — co uczniowi wychodziło, co zrobił lepiej niż ostatnio.
watch_out ("Na co uważać") — błędy techniczne, nawyki do poprawy.
Każda lista: 1–4 punkty, każdy do 300 znaków.

songs — WYŁĄCZNIE utwory, które naprawdę padły w rozmowie. Nigdy nie wymyślaj utworów ani nie dodawaj "podobnych". Dla każdego: title (tytuł), artist (jeśli padł lub jest oczywisty), confidence 0–1 (czy na pewno chodziło o ten utwór), sentiment: "enthusiastic" tylko gdy ktoś wyraźnie się zachwycał — przykładowe sygnały: "sztos", "zajebisty", "mega", "trzeba to nagrać", "fajne", "super" — to przykłady, nie lista; "neutral" w pozostałych przypadkach. suggested_status: gdzie uczeń jest z utworem PO lekcji: to_learn (dopiero wspomniany/do nauki), started (zaczęty, gra fragmenty), remembered (gra całość z pamięci), with_author (gra równo z nagraniem), mastered (gra swobodnie). quotes: do 3 krótkich dosłownych cytatów z transkrypcji, w których pada ten utwór.

homework — do 5 zadań na tydzień wynikających z tego, co nauczyciel kazał poćwiczyć. title: krótki tryb rozkazujący (≤120 znaków). description: co dokładnie i jak (≤600 znaków). Jeśli nic nie zadano — pusta lista.

next_lesson — do 5 krótkich punktów: co podjąć na następnej lekcji (odłożone tematy, obietnice "następnym razem"). Pusta lista, jeśli nic takiego nie padło.`,

  model: TRANSCRIPT_DRAFT_MODEL, // display only — resolveTranscriptDraftModel() is what runs
  temperature: 0.2,
  maxTokens: 2500,

  requiredContext: [],
  optionalContext: [],

  inputValidation: {
    maxLength: 120_000,
    allowedFields: ['summary', 'body'],
    sensitiveDataHandling: 'sanitize',
  },

  enableLogging: true,
  enableAnalytics: false,

  dataAccess: {
    tables: ['lesson_transcripts'],
    permissions: ['read'],
  },

  successMetrics: ['draft_items_accepted'],

  uiConfig: {
    category: 'content',
    icon: 'mic',
    placement: ['inline'],
    loadingMessage: 'Czytam nagranie…',
    errorMessage: 'Nie udało się wygenerować szkicu.',
  },
};

export function buildTranscriptDraftUserMessage(input: TranscriptLessonDraftInput): string {
  const parts = [];
  if (input.summary?.trim()) parts.push(`PODSUMOWANIE:\n${input.summary.trim()}`);
  parts.push(`TRANSKRYPCJA:\n${input.body.trim()}`);
  return parts.join('\n\n');
}

/**
 * One structured call, retried once: the free tier occasionally answers `{}`
 * (seen 1 in 4 on 2026-10-14). No raw-JSON fallback on purpose — a
 * half-parsed draft is worse than an error toast the teacher can retry.
 */
export async function generateTranscriptLessonDraft(
  input: TranscriptLessonDraftInput,
  attempts = 2
): Promise<{ draft: TranscriptDraft; model: string }> {
  const { generateStructuredOutput } = await import('../providers/vercel-ai-adapter');
  const model = resolveTranscriptDraftModel();
  const userMessage = buildTranscriptDraftUserMessage(input);
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const result = await generateStructuredOutput({
        model,
        systemPrompt: transcriptLessonDraftAgent.systemPrompt,
        userMessage,
        schema: TranscriptDraftOutputSchema,
        schemaName: 'TranscriptDraft',
        temperature: transcriptLessonDraftAgent.temperature,
        keepFreeTier: true,
      });
      return { draft: toTranscriptDraft(result.data), model };
    } catch (error: unknown) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Transcript draft generation failed');
}
