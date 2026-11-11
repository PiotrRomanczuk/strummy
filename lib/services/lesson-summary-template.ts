import {
  polishDate,
  STATUS_PL,
  type SummaryPromptInput,
} from '@/lib/ai/agents/post-lesson-summary-prompt';

/** Same sign-off as the AI prompt: the studio has one teacher. */
const SIGNATURE = 'Piotr';

/** Teacher notes may hold working markers that a student should not read. */
const cleanNotes = (notes: string | null) =>
  (notes ?? '')
    .split('\n')
    .filter((line) => !/^\s*seed:/i.test(line))
    .join('\n')
    .trim();

function songLine({ title, artist, status }: SummaryPromptInput['songs'][number]): string {
  const name = artist ? `${title} (${artist})` : title;
  const statusLabel = status ? STATUS_PL[status] : undefined;
  return statusLabel ? `- ${name}: ${statusLabel}` : `- ${name}`;
}

/**
 * The post-lesson message built from the lesson's data alone, for when AI does
 * not answer. It states only what is stored, so it cannot invent progress.
 */
export function buildTemplateSummary(input: SummaryPromptInput): string {
  const { studentFirstName, lessonDate, songs, teacherNotes, homework, nextLessonDate } = input;
  const notes = cleanNotes(teacherNotes);

  const blocks = [
    `Cześć ${studentFirstName},\nkrótko po lekcji z ${polishDate(lessonDate)}.`,
    songs.length > 0 ? `Piosenki:\n${songs.map(songLine).join('\n')}` : '',
    notes,
    homework
      ? `Na następny raz:\n${[homework.title, ...homework.checklist].map((item) => `- ${item}`).join('\n')}`
      : '',
    nextLessonDate ? `Do zobaczenia ${polishDate(nextLessonDate)}.` : '',
    SIGNATURE,
  ];

  return blocks.filter(Boolean).join('\n\n');
}
