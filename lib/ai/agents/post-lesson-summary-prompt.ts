/**
 * Prompt for the post-lesson summary (2026-10-21): a short Polish message from
 * the teacher to the student, built only from the lesson's own data.
 *
 * v2 replaced the original English prompt after a benchmark on four real
 * lessons: v1 answered in English, 2–4× too long, invented BPM targets and
 * practice minutes, and set homework that was never given (0/4 clean on every
 * model). v2: 4/4 clean on gemma4:12b and nemotron-3.5.
 */

export const POST_LESSON_SUMMARY_PROMPT_VERSION = 'v2';

export const POST_LESSON_SUMMARY_PROMPT = `Piszesz krótką wiadomość od nauczyciela gitary do ucznia po lekcji. Uczeń przeczyta ją w mailu i w aplikacji Strummy. Dostajesz fakty z lekcji w polach: student_name, lesson_date, songs_practiced, teacher_notes, homework, next_lesson.

ZASADY
- Pisz po polsku, do ucznia na „ty”, ciepło i konkretnie, jak nauczyciel, który zna ucznia. Bez korpomowy, bez wykrzykników co zdanie, bez emoji.
- Tylko fakty z pól. Nie wymyślaj piosenek, wyników, tempa (BPM), minut ćwiczeń ani postępów, których nie ma w danych. Jeśli przy wykonawcy jest niepewność („lub inny wykonawca”, „?”), podaj sam tytuł.
- Praca domowa: jeśli pole homework zawiera zadanie — podaj je jako „Na następny raz:” w 1–3 punktach. Jeśli jest „brak pracy domowej” — napisz to jednym zdaniem i nie dopisuj własnych ćwiczeń.
- Konkret gitarowy z teacher_notes (struna, próg, palec, bicie, akordy) — wybierz 2–3 najważniejsze rzeczy, nie przepisuj wszystkiego. Pomiń uwagi niezwiązane z grą.
- Trudności formułuj jako kierunek pracy, nie porażkę.
- Status piosenki tłumacz na ludzki język: „rozpoczęta” = zaczęliśmy, „wolne tempo” = grasz już wolno, „z pamięci” = grasz bez kartki, „z nagraniem” = grasz razem z nagraniem, „opanowana” = gotowe.
- Jeśli next_lesson podaje datę — zakończ jednym zdaniem o następnej lekcji. Daty pisz słownie („27 października”), nigdy w formacie 2026-10-27.
- Długość: 60–120 słów. Bez nagłówków markdown; krótkie punkty tylko dla pracy domowej.
- Zacznij od „Cześć <imię>,”. Podpis: „Piotr”.

Zwróć wyłącznie treść wiadomości.`;

export type SummaryPromptInput = {
  studentFirstName: string;
  lessonDate: string;
  songs: { title: string; artist: string | null; status: string | null; notes: string | null }[];
  teacherNotes: string | null;
  homework: { title: string; checklist: string[] } | null;
  nextLessonDate: string | null;
};

const STATUS_PL: Record<string, string> = {
  to_learn: 'do nauki',
  started: 'rozpoczęta',
  slow_tempo: 'wolne tempo',
  remembered: 'z pamięci',
  with_author: 'z nagraniem',
  mastered: 'opanowana',
};

const MONTHS = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

/** "2026-10-27…" → "27 października" (the model is told never to print ISO dates). */
export function polishDate(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split('-').map(Number);
  return month && day ? `${day} ${MONTHS[month - 1]}` : iso;
}

/** Notes are capped: the summary needs the gist, not a whole lesson log. */
const NOTES_LIMIT = 4000;

export function buildSummaryUserMessage(input: SummaryPromptInput): string {
  const songs = input.songs
    .map((s) => {
      const status = s.status ? STATUS_PL[s.status] ?? s.status : null;
      const extra = [status, s.notes?.replace(/\s+/g, ' ').slice(0, 300)].filter(Boolean).join('; ');
      return `${s.title}${s.artist ? ` – ${s.artist}` : ''}${extra ? ` (${extra})` : ''}`;
    })
    .join('; ');
  const homework = input.homework
    ? `${input.homework.title}${input.homework.checklist.length ? `: ${input.homework.checklist.join('; ')}` : ''}`
    : 'brak pracy domowej';

  return [
    `student_name: ${input.studentFirstName}`,
    `lesson_date: ${polishDate(input.lessonDate)}`,
    `songs_practiced: ${songs || 'brak piosenek w lekcji'}`,
    input.teacherNotes ? `teacher_notes: ${input.teacherNotes.slice(0, NOTES_LIMIT)}` : null,
    `homework: ${homework}`,
    input.nextLessonDate ? `next_lesson: ${polishDate(input.nextLessonDate)}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}
