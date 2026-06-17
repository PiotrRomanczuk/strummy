import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type PlatformPulse = {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalSongs: number;
  totalLessons: number;
};

export async function getPlatformPulse(): Promise<PlatformPulse> {
  const supabase = await createClient();
  const [users, students, teachers, songs, lessons] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_student', true),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_teacher', true),
    supabase.from('songs').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('lessons').select('id', { count: 'exact', head: true }).is('deleted_at', null),
  ]);

  return {
    totalUsers: users.count ?? 0,
    totalStudents: students.count ?? 0,
    totalTeachers: teachers.count ?? 0,
    totalSongs: songs.count ?? 0,
    totalLessons: lessons.count ?? 0,
  };
}

export type RecentUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

/** Most-recently created profiles — feeds the admin AI "new students this month" metric. */
export async function getRecentUsers(limit = 10): Promise<RecentUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn('[admin-dashboard] recent users error', { error: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    full_name: (row.full_name as string) ?? null,
    email: (row.email as string) ?? null,
    created_at: row.created_at as string,
  }));
}

export type AdminPendingInvite = {
  id: string;
  email: string;
  createdAt: string;
};

// Shadow profiles act as pending invites — profile rows whose auth user hasn't claimed them yet.
export async function getPendingInvites(limit = 6): Promise<AdminPendingInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .is('user_id', null)
    .not('email', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn('[admin-dashboard] invites error', { error: error.message });
    return [];
  }

  return (data ?? [])
    .filter((row) => row.email !== null)
    .map((row) => ({
      id: row.id as string,
      email: row.email as string,
      createdAt: row.created_at as string,
    }));
}
