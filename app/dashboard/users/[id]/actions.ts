'use server';

import { createClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/logger';
import { Database } from '@/types/database.types';

const log = createLogger('UserActions');

export type RepertoireItem = {
  songId: string;
  title: string;
  author: string;
  status: Database['public']['Enums']['lesson_song_status'];
  lastPlayed: string;
};

export type AssignmentItem = {
  id: string;
  title: string;
  description: string | null;
  status: Database['public']['Enums']['assignment_status'];
  dueDate: string | null;
  createdAt: string;
};

type LessonSongRow = {
  status: Database['public']['Enums']['lesson_song_status'];
  created_at: string;
  songs: { id: string; title: string; author: string } | { id: string; title: string; author: string }[] | null;
  lessons: { student_id: string; scheduled_at: string } | { student_id: string; scheduled_at: string }[] | null;
};

export async function getStudentRepertoire(studentId: string): Promise<RepertoireItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('lesson_songs')
    .select(
      `
      status,
      created_at,
      songs (
        id,
        title,
        author
      ),
      lessons!inner (
        student_id,
        scheduled_at
      )
    `
    )
    .eq('lessons.student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('Error fetching student repertoire', { studentId, error });
    throw new Error('Failed to fetch student repertoire');
  }

  const songMap = new Map<string, RepertoireItem>();

  (data as LessonSongRow[]).forEach((item) => {
    if (!item.songs) return;

    const song = Array.isArray(item.songs) ? item.songs[0] : item.songs;
    if (!song) return;

    const songId = song.id;
    if (!songMap.has(songId)) {
      const lesson = Array.isArray(item.lessons) ? item.lessons[0] : item.lessons;

      songMap.set(songId, {
        songId: song.id,
        title: song.title,
        author: song.author,
        status: item.status,
        lastPlayed: lesson?.scheduled_at || item.created_at,
      });
    }
  });

  return Array.from(songMap.values());
}

export async function getStudentAssignments(studentId: string): Promise<AssignmentItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('assignments')
    .select('id, title, description, status, due_date, created_at')
    .eq('student_id', studentId)
    .order('due_date', { ascending: true });

  if (error) {
    log.error('Error fetching student assignments', { studentId, error });
    throw new Error('Failed to fetch student assignments');
  }

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    dueDate: item.due_date,
    createdAt: item.created_at,
  }));
}
