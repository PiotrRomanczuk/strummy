/**
 * Prompt + input preparation for the lesson-transcript-draft agent (CNT-8).
 *
 * Transcripts name the student and people in the room. Decision 2026-10-14:
 * transcripts may go to OpenRouter only with the student's and teacher's
 * names replaced, so `anonymizeTranscript` runs before anything leaves.
 */

export const TRANSCRIPT_PROMPT_MAX_CHARS = 60_000;

export interface LessonDraftPromptInput {
  transcript: string;
  summary: string | null;
  lessonDate: string;
  studentNames: string[];
  teacherNames: string[];
  knownSongs: { title: string; author: string | null }[];
  skillCatalog: string[];
}

export const LESSON_DRAFT_SYSTEM_PROMPT = `You analyse the transcript of a one-to-one guitar lesson (usually Polish, produced by speech recognition, so song titles and chord names may be misheard). "Uczeń" is the student, "Nauczyciel" is the teacher; other speakers are people in the room and must be ignored.

Walk this tree and fill the JSON:
1. Gate: is this a guitar lesson? If not, set isGuitarLesson=false and leave every list empty.
2. Songs: every song worked on, repeated, set as homework or merely mentioned. Fix obvious mishearings ("Blitzkrieg Pub" → "Blitzkrieg Bop"). If the song is in the "Known songs" list, copy its exact title into catalogTitle. If a song is described but never named (e.g. "a Queen riff"), still add it with the best guess, confidence ≤ 0.5, and add a question.
   Status: to_learn = announced, not played yet; started = first time taken apart; slow_tempo = plays it but slowly; remembered = plays from memory; with_author = plays along with the recording; mastered = finished.
   notes = what THIS student should fix or remember. songFacts = facts true for the song itself (capo, strumming, chords) only when stated.
3. Homework: only what the student should do before the next lesson. isExplicit=true only when it was set explicitly.
4. Skills: techniques practised (palm muting, power chords, alternate picking…). Prefer exact names from the "Skills catalog".
5. Notes: technique, theory, what went well, what needs work, other (gear, tuning, practice habits).
6. teacherCommitments: what the teacher promised ("wyślę ci tabulaturę").
7. profileHints: lasting, non-sensitive facts (musical taste, goals). Never health, family, school, money.
8. logistics: rescheduling, payments, holidays.
9. questions: what the teacher has to clarify.

Rules:
- Write every free-text value in Polish, short and concrete, as notes a teacher would keep.
- Never output personal names, swearing, small talk, or anything about people other than the student.
- Do not invent: if the transcript does not support it, leave it out or null. Lower confidence instead of guessing.
- evidence is a short paraphrase, not a quote.`;

/**
 * The exact JSON shape, for providers without structured output (the agent
 * registry path, e.g. AI_PROVIDER=openai). Without it models invent their own
 * field names and the draft fails validation.
 */
export const LESSON_DRAFT_JSON_SHAPE = `{
  "isGuitarLesson": true,
  "lessonTitle": "string (3-6 words, Polish) or null",
  "songs": [{
    "heardTitle": "string",
    "heardArtist": "string or null",
    "catalogTitle": "exact title from Known songs, or null",
    "role": "practiced | reviewed | homework | mentioned",
    "status": "to_learn | started | slow_tempo | remembered | with_author | mastered | null",
    "sections": ["string"],
    "notes": ["string"],
    "songFacts": { "capoFret": "integer or null", "strummingPattern": "string or null", "chords": ["string"] },
    "confidence": "number 0-1",
    "evidence": "string"
  }],
  "assignment": null or {
    "title": "string", "description": "string", "checklist": ["string"], "songTitles": ["heardTitle"],
    "dailyTargetMinutes": "integer or null", "submissionType": "self_report | audio | video | note",
    "isExplicit": true, "confidence": "number 0-1", "evidence": "string"
  },
  "skills": [{ "skillName": "string", "isFromCatalog": true, "status": "developing | progressing | proficient | mastered", "note": "string", "confidence": "number 0-1", "evidence": "string" }],
  "notes": { "technique": ["string"], "theory": ["string"], "wentWell": ["string"], "needsWork": ["string"], "other": ["string"] },
  "teacherCommitments": ["string"],
  "profileHints": ["string"],
  "logistics": ["string"],
  "questions": ["string"]
}`;

const escapeRegExp =(s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds a matcher for a name and its Polish inflections: "Kuba" also hides
 * "Kuby", "Kubie", "Kubą". Names shorter than 3 letters are skipped — they
 * match too many ordinary words.
 */
function nameMatcher(token: string): RegExp | null {
  if (token.length < 3) return null;
  const stem = token.length >= 4 && /[aeiouyąęó]$/i.test(token) ? token.slice(0, -1) : token;
  return new RegExp(`(?<!\\p{L})${escapeRegExp(stem)}\\p{L}{0,3}(?!\\p{L})`, 'giu');
}

function replaceNames(text: string, names: string[], replacement: string): string {
  const tokens = [...new Set(names.flatMap((n) => n.split(/\s+/)).map((t) => t.trim()))];
  return tokens.reduce((acc, token) => {
    const matcher = nameMatcher(token);
    return matcher ? acc.replace(matcher, replacement) : acc;
  }, text);
}

export function anonymizeTranscript(text: string, studentNames: string[], teacherNames: string[]): string {
  return replaceNames(replaceNames(text, studentNames, 'Uczeń'), teacherNames, 'Nauczyciel');
}

export function buildLessonDraftUserMessage(input: LessonDraftPromptInput): string {
  const clean = (text: string) => anonymizeTranscript(text, input.studentNames, input.teacherNames);
  const transcript = clean(input.transcript).slice(0, TRANSCRIPT_PROMPT_MAX_CHARS);
  const songs = input.knownSongs.map((s) => `- ${s.title}${s.author ? ` — ${s.author}` : ''}`);

  return [
    `Lesson date: ${input.lessonDate}`,
    '',
    'Known songs (student repertoire and recent lessons):',
    songs.length ? songs.join('\n') : '- (none)',
    '',
    'Skills catalog:',
    input.skillCatalog.length ? input.skillCatalog.map((s) => `- ${s}`).join('\n') : '- (none)',
    '',
    input.summary ? `Recorder summary (may be wrong):\n${clean(input.summary)}\n` : null,
    'Transcript:',
    '---',
    transcript,
    '---',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
