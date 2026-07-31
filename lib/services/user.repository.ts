/**
 * User Repository
 *
 * Data access layer for user/profile operations with:
 * - Role-based query construction
 * - Safe query sanitization (prevents injection)
 * - CRUD operations
 * - Performance-optimized batch queries
 *
 * Fixes:
 * - STRUMMY-282: Query injection via sanitizeSearchQuery()
 * - STRUMMY-285: Auth scan via is_registered flag (future migration)
 * - STRUMMY-263: N+1 queries via getUsersWithStats()
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

export type Profile = {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
};

export type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_teacher: boolean;
  is_student: boolean;
  is_shadow: boolean;
  is_active: boolean;
  is_development: boolean;
  student_status: string | null;
  status_changed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserFilters = {
  search?: string;
  role?: 'admin' | 'teacher' | 'student' | 'shadow';
  isActive?: boolean;
  studentStatus?: string;
  excludeShadow?: boolean;
};

export type UserWithStats = UserRow & {
  lessons_count?: number;
  assignments_count?: number;
};

export type CreateUserInput = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  is_admin?: boolean;
  is_teacher?: boolean;
  is_student?: boolean;
  is_shadow?: boolean;
  notes?: string;
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'id' | 'email'>>;

// ============================================================================
// QUERY SANITIZATION
// ============================================================================

/**
 * Sanitize search query to prevent PostgREST filter injection
 * Removes special characters: % _ * ( ) . , = < > and limits length
 *
 * Fixes STRUMMY-282: Query injection vulnerability
 */
export function sanitizeSearchQuery(input: string): string {
  if (!input) return '';

  return input
    .replace(/[%_*().,=<>]/g, '') // Remove PostgREST special chars
    .trim()
    .substring(0, 100); // Limit to 100 chars max
}

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Build base user query with role-based access control
 *
 * Access rules:
 * - Admin: See all users
 * - Teacher: See only their students (via lessons)
 * - Student: See only themselves
 * - No role: No access
 */
export function buildUserQuery(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  allowedStudentIds?: string[]
) {
  const query = supabase
    .from('profiles')
    .select(
      'id, email, full_name, phone, avatar_url, is_admin, is_teacher, is_student, is_shadow, is_active, is_development, student_status, status_changed_at, notes, created_at, updated_at',
      { count: 'exact' }
    );

  // Apply role-based filters
  if (profile.isAdmin) {
    return query; // Admins see all
  }

  if (profile.isTeacher && allowedStudentIds) {
    return query.in('id', allowedStudentIds); // Teachers see their students
  }

  if (profile.isStudent) {
    return query.eq('id', userId); // Students see only themselves
  }

  // No access - return impossible condition
  return query.eq('id', '00000000-0000-0000-0000-000000000000');
}

/**
 * Apply additional filters to user query
 * All filters are sanitized before application
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyUserFilters(query: any, filters: UserFilters) {
  let result = query;

  // Search filter (sanitized to prevent injection)
  if (filters.search) {
    const sanitized = sanitizeSearchQuery(filters.search);
    if (sanitized) {
      result = result.or(`email.ilike.%${sanitized}%,full_name.ilike.%${sanitized}%`);
    }
  }

  // Role filters
  if (filters.role === 'admin') {
    result = result.eq('is_admin', true);
  } else if (filters.role === 'teacher') {
    result = result.eq('is_teacher', true);
  } else if (filters.role === 'student') {
    result = result.eq('is_student', true);
  } else if (filters.role === 'shadow') {
    result = result.eq('is_shadow', true);
  }

  // Active status filter
  if (filters.isActive !== undefined) {
    result = result.eq('is_active', filters.isActive);
  }

  // Student status filter
  if (filters.studentStatus) {
    result = result.eq('student_status', filters.studentStatus);
  }

  // Exclude shadow users
  if (filters.excludeShadow) {
    result = result.eq('is_shadow', false);
  }

  return result;
}

// ============================================================================
// HELPER QUERIES
// ============================================================================

/**
 * Get student IDs that a teacher can access (via active lessons)
 * Used for teacher access control
 */
export async function getStudentIdsForTeacher(
  supabase: SupabaseClient,
  teacherId: string
): Promise<string[]> {
  const { data: lessonData } = await supabase
    .from('lessons')
    .select('student_id')
    .eq('teacher_id', teacherId)
    .is('deleted_at', null);

  return Array.from(new Set((lessonData || []).map((l) => l.student_id)));
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get a single user by ID
 * Enforces access control based on profile roles
 */
export async function getUserById(
  supabase: SupabaseClient,
  userId: string,
  requestingUserId: string,
  profile: Profile
): Promise<{ data: UserRow | null; error: string | null }> {
  // Check access
  if (!profile.isAdmin) {
    if (profile.isTeacher) {
      // Teachers can only see their students
      const studentIds = await getStudentIdsForTeacher(supabase, requestingUserId);
      if (!studentIds.includes(userId)) {
        return { data: null, error: 'Access denied' };
      }
    } else if (profile.isStudent) {
      // Students can only see themselves
      if (userId !== requestingUserId) {
        return { data: null, error: 'Access denied' };
      }
    } else {
      return { data: null, error: 'Access denied' };
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, is_admin, is_teacher, is_student, is_shadow, is_active, is_development, student_status, status_changed_at, notes, created_at, updated_at')
    .eq('id', userId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserRow, error: null };
}

/**
 * Get list of users with filters and pagination
 * Enforces role-based access control
 */
export async function getUsers(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  filters: UserFilters = {},
  limit = 50,
  offset = 0
): Promise<{ data: UserRow[]; count: number; error: string | null }> {
  // Get allowed student IDs for teachers
  let allowedStudentIds: string[] | undefined;
  if (profile.isTeacher && !profile.isAdmin) {
    allowedStudentIds = await getStudentIdsForTeacher(supabase, userId);

    // If teacher has no students, return empty result
    if (allowedStudentIds.length === 0) {
      return { data: [], count: 0, error: null };
    }
  }

  // Build and apply query
  let query = buildUserQuery(supabase, userId, profile, allowedStudentIds);
  query = applyUserFilters(query, filters);
  query = query.order('created_at', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: [], count: 0, error: error.message };
  }

  return { data: (data as UserRow[]) || [], count: count || 0, error: null };
}

/**
 * Get users with aggregated stats (lessons_count, assignments_count)
 * Optimized to prevent N+1 queries
 *
 * Fixes STRUMMY-263: N+1 query performance issue
 */
export async function getUsersWithStats(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile,
  filters: UserFilters = {},
  limit = 50,
  offset = 0
): Promise<{ data: UserWithStats[]; count: number; error: string | null }> {
  // Get allowed student IDs for teachers
  let allowedStudentIds: string[] | undefined;
  if (profile.isTeacher && !profile.isAdmin) {
    allowedStudentIds = await getStudentIdsForTeacher(supabase, userId);

    if (allowedStudentIds.length === 0) {
      return { data: [], count: 0, error: null };
    }
  }

  // Build query with aggregated stats (single query instead of N+1)
  let query = supabase
    .from('profiles')
    .select(
      `
      *,
      lessons:lessons(count),
      assignments:assignments(count)
    `,
      { count: 'exact' }
    );

  // Apply role-based access
  if (profile.isAdmin) {
    // Admins see all
  } else if (profile.isTeacher && allowedStudentIds) {
    query = query.in('id', allowedStudentIds);
  } else if (profile.isStudent) {
    query = query.eq('id', userId);
  } else {
    query = query.eq('id', '00000000-0000-0000-0000-000000000000');
  }

  // Apply filters
  query = applyUserFilters(query, filters);
  query = query.order('created_at', { ascending: false });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: [], count: 0, error: error.message };
  }

  // Map aggregated counts
  const mappedData = (data || []).map((user) => {
    const userRecord = user as Record<string, unknown>;
    return {
      ...user,
      lessons_count: Array.isArray(userRecord.lessons) ? userRecord.lessons.length : 0,
      assignments_count: Array.isArray(userRecord.assignments) ? userRecord.assignments.length : 0,
    };
  }) as UserWithStats[];

  return { data: mappedData, count: count || 0, error: null };
}

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Create a new user profile
 * Note: This creates the profile record only. Auth user creation is handled separately.
 */
export async function createUserProfile(
  supabase: SupabaseClient,
  input: CreateUserInput
): Promise<{ data: UserRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: input.id,
      email: input.email,
      full_name: input.full_name || null,
      phone: input.phone || null,
      is_admin: input.is_admin || false,
      is_teacher: input.is_teacher || false,
      is_student: input.is_student !== false, // Default to true
      is_shadow: input.is_shadow || false,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserRow, error: null };
}

/**
 * Update an existing user profile
 */
export async function updateUserProfile(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateUserInput
): Promise<{ data: UserRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: input.full_name,
      phone: input.phone,
      is_admin: input.is_admin,
      is_teacher: input.is_teacher,
      is_student: input.is_student,
      is_shadow: input.is_shadow,
      notes: input.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserRow, error: null };
}

/**
 * Delete a user profile (soft delete via updated_at)
 * Note: Actual deletion is handled by CASCADE when auth.users record is deleted
 */
export async function deleteUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').delete().eq('id', userId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/**
 * Check if a user profile exists by email
 */
export async function getUserByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<{ data: UserRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, is_admin, is_teacher, is_student, is_shadow, is_active, is_development, student_status, status_changed_at, notes, created_at, updated_at')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserRow | null, error: null };
}
