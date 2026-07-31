/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Database } from '../types/database.types';
import crypto from 'crypto';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const LEGACY_DATA_PATH = path.join(process.cwd(), '.LEGACY_DATA');

// Helper to read JSON
function readJson(filename: string) {
  const filePath = path.join(LEGACY_DATA_PATH, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Mappers
function mapDifficultyLevel(level: string | null): Database["public"]["Enums"]["difficulty_level"] {
  if (!level) return 'beginner'; // Default
  const l = level.toLowerCase();
  if (l.includes('begin')) return 'beginner';
  if (l.includes('inter')) return 'intermediate';
  if (l.includes('advan')) return 'advanced';
  return 'beginner';
}

function mapMusicKey(key: string | null): Database["public"]["Enums"]["music_key"] {
  if (!key) return 'C'; // Default
  // Ensure key matches enum values exactly
  const validKeys = [
    "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
    "Cm", "C#m", "Dm", "D#m", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bbm", "Bm"
  ];
  if (validKeys.includes(key)) return key as Database["public"]["Enums"]["music_key"];
  return 'C';
}

function mapLessonStatus(status: string | null): Database["public"]["Enums"]["lesson_status"] {
  if (!status) return 'SCHEDULED';
  // JSON has SCHEDULED, etc. Schema has SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
  // Assuming JSON values are uppercase and match mostly
  const s = status.toUpperCase();
  const validStatuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "RESCHEDULED"];
  if (validStatuses.includes(s)) return s as Database["public"]["Enums"]["lesson_status"];
  return 'SCHEDULED';
}

function mapLessonSongStatus(status: string | null): Database["public"]["Enums"]["lesson_song_status"] {
  if (!status) return 'to_learn';
  // JSON has STARTED. Schema has to_learn, started, remembered, with_author, mastered
  const s = status.toLowerCase();
  if (s === 'started') return 'started';
  if (s === 'mastered') return 'mastered';
  if (s === 'to_learn') return 'to_learn';
  // Map others if needed
  return 'to_learn';
}

export async function migrateProfiles() {
  console.log('Migrating Profiles...');
  const profiles = readJson('profiles.json');
  const mappedProfiles = profiles.map((p: any) => ({
    id: p.user_id,
    email: p.email,
    full_name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.username || 'Unknown',
    is_student: p.isStudent || false,
    is_teacher: p.isTeacher || false,
    is_admin: p.isAdmin || false,
    created_at: p.created_at,
    updated_at: p.updated_at || p.created_at,
    // avatar_url: null,
    // notes: null
  }));

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < mappedProfiles.length; i += batchSize) {
    const batch = mappedProfiles.slice(i, i + batchSize);
    const { error } = await supabase.from('profiles').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting profiles batch ${i}:`, error);
    } else {
      console.log(`Inserted profiles batch ${i} - ${i + batch.length}`);
    }
  }
}

async function migrateSongs() {
  console.log('Migrating Songs...');
  const songs = readJson('songs.json');
  const mappedSongs = songs.map((s: any) => ({
    id: s.id,
    title: s.title || 'Untitled',
    author: s.author || 'Unknown',
    level: mapDifficultyLevel(s.level),
    key: mapMusicKey(s.key),
    ultimate_guitar_link: s.ultimate_guitar_link || '',
    created_at: s.created_at,
    updated_at: s.updated_at || s.created_at,
    chords: s.chords
  }));

  const batchSize = 100;
  for (let i = 0; i < mappedSongs.length; i += batchSize) {
    const batch = mappedSongs.slice(i, i + batchSize);
    const { error } = await supabase.from('songs').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting songs batch ${i}:`, error);
    } else {
      console.log(`Inserted songs batch ${i} - ${i + batch.length}`);
    }
  }
}

export async function migrateLessons() {
  console.log('Migrating Lessons...');
  const lessons = readJson('lessons.json');
  
  // Group lessons by teacher and student to assign numbers
  const lessonsByPair: Record<string, any[]> = {};
  
  lessons.forEach((l: any) => {
    const key = `${l.teacher_id}_${l.student_id}`;
    if (!lessonsByPair[key]) lessonsByPair[key] = [];
    lessonsByPair[key].push(l);
  });

  const mappedLessons: any[] = [];

  Object.values(lessonsByPair).forEach(group => {
    // Sort by date
    group.sort((a, b) => new Date(a.date || a.start_time).getTime() - new Date(b.date || b.start_time).getTime());
    
    group.forEach((l, index) => {
      mappedLessons.push({
        id: l.id,
        student_id: l.student_id,
        teacher_id: l.teacher_id,
        scheduled_at: l.date || l.start_time || new Date().toISOString(),
        status: mapLessonStatus(l.status),
        notes: l.notes,
        lesson_teacher_number: l.lesson_teacher_number || (index + 1), // Assign sequential number if missing
        created_at: l.created_at,
        updated_at: l.updated_at || l.created_at,
        title: l.title
      });
    });
  });

  const batchSize = 100;
  for (let i = 0; i < mappedLessons.length; i += batchSize) {
    const batch = mappedLessons.slice(i, i + batchSize);
    const { error } = await supabase.from('lessons').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`Error inserting lessons batch ${i}:`, error);
    } else {
      console.log(`Inserted lessons batch ${i} - ${i + batch.length}`);
    }
  }
}

export async function migrateLessonSongs() {
  console.log('Migrating Lesson Songs...');
  const lessonSongs = readJson('lesson.songs.json');
  const mappedLessonSongs = lessonSongs.map((ls: any) => ({
    id: crypto.randomUUID(), 
    lesson_id: ls.lesson_id,
    song_id: ls.song_id,
    status: mapLessonSongStatus(ls.song_status),
    created_at: ls.created_at,
    updated_at: ls.updated_at || ls.created_at
  }));

  const batchSize = 100;
  for (let i = 0; i < mappedLessonSongs.length; i += batchSize) {
    const batch = mappedLessonSongs.slice(i, i + batchSize);
    const { error } = await supabase.from('lesson_songs').upsert(batch, { onConflict: 'lesson_id, song_id', ignoreDuplicates: true }); 
    if (error) {
      console.error(`Error inserting lesson_songs batch ${i}:`, error);
    } else {
      console.log(`Inserted lesson_songs batch ${i} - ${i + batch.length}`);
    }
  }
}

async function main() {
  try {
    // await migrateProfiles();
    await migrateSongs();
    // await migrateLessons();
    // await migrateLessonSongs();
    console.log('Migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

main();
