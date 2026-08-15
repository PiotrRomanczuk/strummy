'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import {
  CsvSongImportRequestSchema,
  type CsvSongRow,
  type CsvSongImportResult,
  type CsvSongImportRowResult,
} from '@/schemas/CsvSongImportSchema';
import { parseEuropeanDate, groupRowsByDate, findOrCreateSong } from './import-csv-songs.helpers';

export async function importCsvSongs(
  input: unknown
): Promise<CsvSongImportResult> {
  const { user, profileId, isTeacher, isAdmin, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  if (!user || (!isTeacher && !isAdmin)) {
    return { success: false, error: 'Unauthorized' };
  }

  const parsed = CsvSongImportRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { studentId, rows, validateOnly, repertoireOnly } = parsed.data;
  const supabase = await createClient();
  const counters = { songsMatched: 0, songsCreated: 0 };
  const songCache = new Map<string, { id: string; matchStatus: 'matched' | 'low_confidence' | 'new'; matchedTitle?: string; score?: number }>();

  if (repertoireOnly) {
    return importRepertoireOnly(supabase, rows, studentId, profileId, validateOnly, songCache, counters);
  }

  // Auto-route: split rows by date presence
  const rowsWithDates = rows.filter((r) => r.date);
  const rowsWithoutDates = rows.filter((r) => !r.date);

  let lessonResult: CsvSongImportResult = { success: true, results: [], summary: undefined };
  let repertoireResult: CsvSongImportResult = { success: true, results: [], summary: undefined };

  if (rowsWithDates.length > 0) {
    lessonResult = await importWithLessons(supabase, rowsWithDates, studentId, profileId, validateOnly, songCache, counters);
  }
  if (rowsWithoutDates.length > 0) {
    repertoireResult = await importRepertoireOnly(supabase, rowsWithoutDates, studentId, profileId, validateOnly, songCache, counters);
  }

  // If only one path ran, return it directly
  if (rowsWithoutDates.length === 0) return lessonResult;
  if (rowsWithDates.length === 0) return repertoireResult;

  // Merge results from both paths
  return {
    success: lessonResult.success && repertoireResult.success,
    results: [...(lessonResult.results || []), ...(repertoireResult.results || [])],
    summary: {
      totalRows: rows.length,
      songsMatched: counters.songsMatched,
      songsCreated: counters.songsCreated,
      lessonsCreated: lessonResult.summary?.lessonsCreated || 0,
      lessonsExisting: lessonResult.summary?.lessonsExisting || 0,
      repertoireAdded: repertoireResult.summary?.repertoireAdded || 0,
      errors: (lessonResult.summary?.errors || 0) + (repertoireResult.summary?.errors || 0),
    },
  };
}

async function importRepertoireOnly(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: CsvSongRow[],
  studentId: string,
  // A profiles.id: both lessons.teacher_id and student_repertoire.assigned_by
  // are profile-id FKs, and the lessons INSERT policy checks the row against
  // current_profile_id(). Passing an auth id made every lesson insert fail RLS.
  teacherId: string,
  validateOnly: boolean,
  songCache: Map<string, { id: string; matchStatus: 'matched' | 'low_confidence' | 'new'; matchedTitle?: string; score?: number }>,
  counters: { songsMatched: number; songsCreated: number },
): Promise<CsvSongImportResult> {
  const results: CsvSongImportRowResult[] = [];
  let errorCount = 0;
  let repertoireAdded = 0;

  for (const row of rows) {
    const rowIndex = rows.indexOf(row);
    const author = row.author?.trim() || 'Unknown';

    try {
      const match = await findOrCreateSong(supabase, row.title, author, validateOnly, songCache, counters);

      if (match.error) {
        results.push({
          rowIndex, date: '', title: row.title, author,
          success: false, error: match.error,
          matchStatus: 'new', lessonCreated: false, songCreated: false, isRepertoire: true,
        });
        errorCount++;
        continue;
      }

      if (!validateOnly && match.songId) {
        const { error: upsertError } = await supabase
          .from('student_repertoire')
          .upsert(
            {
              student_id: studentId,
              song_id: match.songId,
              current_status: 'to_learn',
              assigned_by: teacherId,
              is_active: true,
              priority: 'normal',
            },
            { onConflict: 'student_id,song_id' }
          );
        if (!upsertError) repertoireAdded++;
      } else if (validateOnly) {
        repertoireAdded++;
      }

      results.push({
        rowIndex, date: '', title: row.title, author,
        success: true,
        matchStatus: match.matchStatus, matchedSongTitle: match.matchedTitle,
        matchScore: match.matchScore, songId: match.songId,
        lessonCreated: false, songCreated: match.songCreated, isRepertoire: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({
        rowIndex, date: '', title: row.title, author,
        success: false, error: message,
        matchStatus: 'new', lessonCreated: false, songCreated: false, isRepertoire: true,
      });
      errorCount++;
    }
  }

  return {
    success: true,
    results,
    summary: {
      totalRows: rows.length,
      songsMatched: counters.songsMatched,
      songsCreated: counters.songsCreated,
      lessonsCreated: 0,
      lessonsExisting: 0,
      repertoireAdded,
      errors: errorCount,
    },
  };
}

async function importWithLessons(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: CsvSongRow[],
  studentId: string,
  teacherId: string,
  validateOnly: boolean,
  songCache: Map<string, { id: string; matchStatus: 'matched' | 'low_confidence' | 'new'; matchedTitle?: string; score?: number }>,
  counters: { songsMatched: number; songsCreated: number },
): Promise<CsvSongImportResult> {
  const results: CsvSongImportRowResult[] = [];
  let errorCount = 0;
  let lessonsCreated = 0;
  let lessonsExisting = 0;

  const dateGroups = groupRowsByDate(rows);

  for (const [dateStr, dateRows] of dateGroups) {
    const isoDate = parseEuropeanDate(dateStr);
    if (!isoDate) {
      for (const row of dateRows) {
        results.push({
          rowIndex: rows.indexOf(row), date: dateStr, title: row.title,
          author: row.author || '', success: false,
          error: `Invalid date: ${dateStr}`,
          matchStatus: 'new', lessonCreated: false, songCreated: false, isRepertoire: false,
        });
        errorCount++;
      }
      continue;
    }

    const lesson = await findOrCreateLesson(supabase, teacherId, studentId, isoDate, validateOnly);
    if (lesson.error) {
      for (const row of dateRows) {
        results.push({
          rowIndex: rows.indexOf(row), date: dateStr, title: row.title,
          author: row.author || '', success: false, error: lesson.error,
          matchStatus: 'new', lessonCreated: false, songCreated: false, isRepertoire: false,
        });
        errorCount++;
      }
      continue;
    }

    if (lesson.created) lessonsCreated++;
    else if (lesson.id) lessonsExisting++;

    for (const row of dateRows) {
      const rowIndex = rows.indexOf(row);
      const author = row.author?.trim() || 'Unknown';

      try {
        const match = await findOrCreateSong(supabase, row.title, author, validateOnly, songCache, counters);

        if (match.error) {
          results.push({
            rowIndex, date: dateStr, title: row.title, author,
            success: false, error: match.error,
            matchStatus: 'new', lessonCreated: lesson.created, songCreated: false, isRepertoire: false,
          });
          errorCount++;
          continue;
        }

        if (!validateOnly && match.songId && lesson.id) {
          await supabase
            .from('lesson_songs')
            .upsert(
              { lesson_id: lesson.id, song_id: match.songId, status: 'to_learn' },
              { onConflict: 'lesson_id,song_id' }
            );
        }

        results.push({
          rowIndex, date: dateStr, title: row.title, author,
          success: true,
          matchStatus: match.matchStatus, matchedSongTitle: match.matchedTitle,
          matchScore: match.matchScore, songId: match.songId,
          lessonId: lesson.id, lessonCreated: lesson.created,
          songCreated: match.songCreated, isRepertoire: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          rowIndex, date: dateStr, title: row.title, author,
          success: false, error: message,
          matchStatus: 'new', lessonCreated: lesson.created, songCreated: false, isRepertoire: false,
        });
        errorCount++;
      }
    }
  }

  return {
    success: true,
    results,
    summary: {
      totalRows: rows.length,
      songsMatched: counters.songsMatched,
      songsCreated: counters.songsCreated,
      lessonsCreated,
      lessonsExisting,
      repertoireAdded: 0,
      errors: errorCount,
    },
  };
}

async function findOrCreateLesson(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  studentId: string,
  isoDate: string,
  validateOnly: boolean,
): Promise<{ id?: string; created: boolean; error?: string }> {
  if (validateOnly) return { created: false };

  const dateOnly = isoDate.split('T')[0];
  const { data: existing } = await supabase
    .from('lessons')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('student_id', studentId)
    .gte('scheduled_at', `${dateOnly}T00:00:00Z`)
    .lt('scheduled_at', `${dateOnly}T23:59:59Z`)
    .is('deleted_at', null)
    .limit(1)
    .single();

  if (existing) return { id: existing.id, created: false };

  const { data: newLesson, error } = await supabase
    .from('lessons')
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      scheduled_at: isoDate,
      status: 'COMPLETED',
      title: 'Lesson (imported)',
    })
    .select('id')
    .single();

  if (error || !newLesson) {
    return { created: false, error: `Failed to create lesson: ${error?.message || 'Unknown error'}` };
  }

  return { id: newLesson.id, created: true };
}
