/**
 * User Service
 *
 * Business logic and authorization layer for user operations.
 * Enforces role-based access control and delegates to repository layer.
 *
 * Authorization Rules:
 * - Admins: Full access to all operations
 * - Teachers: Can view/create students only
 * - Students: Can view self only
 *
 * Part of Phase 1 (Foundation) - Users Module Security & Architecture Cleanup
 *
 * Note: No 'use server' directive - these are utility functions used in API routes
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getUserById,
  getUsers,
  getUsersWithStats,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getUserByEmail,
  getStudentIdsForTeacher,
  type Profile,
  type UserRow,
  type UserFilters,
  type CreateUserInput,
  type UpdateUserInput,
  type UserWithStats,
} from '@/lib/repositories/user.repository';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type ServiceResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
      code?:
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'NOT_FOUND'
        | 'CONFLICT'
        | 'VALIDATION_ERROR'
        | 'INTERNAL_ERROR';
    };

/**
 * A denial always explains itself. Modelled as a discriminated union so the
 * compiler enforces it — every `allowed: false` in this file supplies a reason,
 * which is what lets callers use `authCheck.reason` directly with no fallback.
 */
export type AuthorizationCheck =
  { allowed: true; reason?: never } | { allowed: false; reason: string };

// ============================================================================
// AUTHORIZATION CHECKS
// ============================================================================

/**
 * Check if user can view another user's profile
 */
export function canViewUser(
  requestingUserId: string,
  profile: Profile,
  targetUserId: string,
  allowedStudentIds?: string[]
): AuthorizationCheck {
  // Admins can view anyone
  if (profile.isAdmin) {
    return { allowed: true };
  }

  // Teachers can view their students
  if (profile.isTeacher && allowedStudentIds) {
    if (allowedStudentIds.includes(targetUserId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Teachers can only view their students' };
  }

  // Students can view only themselves
  if (profile.isStudent) {
    if (requestingUserId === targetUserId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Students can only view their own profile' };
  }

  return { allowed: false, reason: 'No access' };
}

/**
 * Check if user can list users (with filters)
 */
export function canListUsers(profile: Profile): AuthorizationCheck {
  // Admins can list all users
  if (profile.isAdmin) {
    return { allowed: true };
  }

  // Teachers can list their students
  if (profile.isTeacher) {
    return { allowed: true };
  }

  // Students can list only themselves
  if (profile.isStudent) {
    return { allowed: true }; // Repository enforces self-only filtering
  }

  return { allowed: false, reason: 'No access to user list' };
}

/**
 * Check if user can create a new user
 */
export function canCreateUser(profile: Profile, createInput: CreateUserInput): AuthorizationCheck {
  // Admins can create any user
  if (profile.isAdmin) {
    return { allowed: true };
  }

  // Teachers can only create students
  if (profile.isTeacher) {
    if (createInput.is_admin || createInput.is_teacher) {
      return { allowed: false, reason: 'Teachers can only create students' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Only admins and teachers can create users' };
}

/**
 * Check if user can update another user's profile
 */
export function canUpdateUser(
  requestingUserId: string,
  profile: Profile,
  targetUserId: string,
  updateInput: UpdateUserInput,
  allowedStudentIds?: string[]
): AuthorizationCheck {
  // Admins can update anyone
  if (profile.isAdmin) {
    return { allowed: true };
  }

  // Teachers can update their students (limited fields)
  if (profile.isTeacher && allowedStudentIds) {
    if (!allowedStudentIds.includes(targetUserId)) {
      return { allowed: false, reason: 'Teachers can only update their students' };
    }

    // Teachers cannot change role flags
    if (
      updateInput.is_admin !== undefined ||
      updateInput.is_teacher !== undefined ||
      updateInput.is_student !== undefined
    ) {
      return { allowed: false, reason: 'Teachers cannot change user roles' };
    }

    return { allowed: true };
  }

  // Students can update only themselves (limited fields)
  if (profile.isStudent) {
    if (requestingUserId !== targetUserId) {
      return { allowed: false, reason: 'Students can only update their own profile' };
    }

    // Students cannot change role flags or shadow status
    if (
      updateInput.is_admin !== undefined ||
      updateInput.is_teacher !== undefined ||
      updateInput.is_student !== undefined ||
      updateInput.is_shadow !== undefined
    ) {
      return { allowed: false, reason: 'Students cannot change roles' };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'No update access' };
}

/**
 * Check if user can delete another user
 */
export function canDeleteUser(
  requestingUserId: string,
  profile: Profile,
  targetUserId: string,
  allowedStudentIds?: string[]
): AuthorizationCheck {
  // Admins can delete anyone (except themselves)
  if (profile.isAdmin) {
    if (requestingUserId === targetUserId) {
      return { allowed: false, reason: 'Cannot delete your own account' };
    }
    return { allowed: true };
  }

  // Teachers can delete their students
  if (profile.isTeacher && allowedStudentIds) {
    if (!allowedStudentIds.includes(targetUserId)) {
      return { allowed: false, reason: 'Teachers can only delete their students' };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Only admins and teachers can delete users' };
}

// ============================================================================
// BUSINESS OPERATIONS
// ============================================================================

/**
 * Get a single user by ID with authorization check
 */
export async function getUserService(
  supabase: SupabaseClient,
  requestingUserId: string,
  profile: Profile,
  targetUserId: string
): Promise<ServiceResult<UserRow>> {
  try {
    // Get allowed student IDs for teachers
    let allowedStudentIds: string[] | undefined;
    if (profile.isTeacher && !profile.isAdmin) {
      allowedStudentIds = await getStudentIdsForTeacher(supabase, requestingUserId);
    }

    // Check authorization
    const authCheck = canViewUser(requestingUserId, profile, targetUserId, allowedStudentIds);
    if (!authCheck.allowed) {
      return {
        success: false,
        error: authCheck.reason,
        code: 'FORBIDDEN',
      };
    }

    // Fetch user from repository
    const result = await getUserById(supabase, targetUserId, requestingUserId, profile);

    if (result.error) {
      return {
        success: false,
        error: result.error,
        code: 'NOT_FOUND',
      };
    }

    if (!result.data) {
      return {
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    logger.error('Error in getUserService:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get list of users with filters and pagination
 */
export async function getUsersList(
  supabase: SupabaseClient,
  requestingUserId: string,
  profile: Profile,
  filters: UserFilters = {},
  limit = 50,
  offset = 0
): Promise<ServiceResult<{ data: UserRow[]; total: number }>> {
  try {
    // Check authorization
    const authCheck = canListUsers(profile);
    if (!authCheck.allowed) {
      return {
        success: false,
        error: authCheck.reason,
        code: 'FORBIDDEN',
      };
    }

    // Fetch users from repository
    const result = await getUsers(supabase, requestingUserId, profile, filters, limit, offset);

    if (result.error) {
      return {
        success: false,
        error: result.error,
        code: 'INTERNAL_ERROR',
      };
    }

    return {
      success: true,
      data: {
        data: result.data,
        total: result.count,
      },
    };
  } catch (error) {
    logger.error('Error in getUsersList:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get users with stats (lessons, assignments) for dashboard
 */
export async function getUsersListWithStats(
  supabase: SupabaseClient,
  requestingUserId: string,
  profile: Profile,
  filters: UserFilters = {},
  limit = 50,
  offset = 0
): Promise<ServiceResult<{ data: UserWithStats[]; total: number }>> {
  try {
    // Check authorization
    const authCheck = canListUsers(profile);
    if (!authCheck.allowed) {
      return {
        success: false,
        error: authCheck.reason,
        code: 'FORBIDDEN',
      };
    }

    // Fetch users with stats from repository
    const result = await getUsersWithStats(
      supabase,
      requestingUserId,
      profile,
      filters,
      limit,
      offset
    );

    if (result.error) {
      return {
        success: false,
        error: result.error,
        code: 'INTERNAL_ERROR',
      };
    }

    return {
      success: true,
      data: {
        data: result.data,
        total: result.count,
      },
    };
  } catch (error) {
    logger.error('Error in getUsersListWithStats:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Create a new user profile
 */
export async function createUser(
  supabase: SupabaseClient,
  requestingUserId: string,
  profile: Profile,
  input: CreateUserInput
): Promise<ServiceResult<UserRow>> {
  try {
    // Check authorization
    const authCheck = canCreateUser(profile, input);
    if (!authCheck.allowed) {
      return {
        success: false,
        error: authCheck.reason,
        code: 'FORBIDDEN',
      };
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(supabase, input.email);
    if (existingUser.data) {
      return {
        success: false,
        error: 'User with this email already exists',
        code: 'CONFLICT',
      };
    }

    // Create user via repository
    const result = await createUserProfile(supabase, input);

    if (result.error) {
      return {
        success: false,
        error: result.error,
        code: 'INTERNAL_ERROR',
      };
    }

    if (!result.data) {
      return {
        success: false,
        error: 'Failed to create user',
        code: 'INTERNAL_ERROR',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    logger.error('Error in createUser:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Update an existing user profile
 */
export async function updateUser(
  supabase: SupabaseClient,
  requestingUserId: string,
  profile: Profile,
  targetUserId: string,
  input: UpdateUserInput
): Promise<ServiceResult<UserRow>> {
  try {
    // Get allowed student IDs for teachers
    let allowedStudentIds: string[] | undefined;
    if (profile.isTeacher && !profile.isAdmin) {
      allowedStudentIds = await getStudentIdsForTeacher(supabase, requestingUserId);
    }

    // Check authorization
    const authCheck = canUpdateUser(
      requestingUserId,
      profile,
      targetUserId,
      input,
      allowedStudentIds
    );
    if (!authCheck.allowed) {
      return {
        success: false,
        error: authCheck.reason,
        code: 'FORBIDDEN',
      };
    }

    // Check if user exists
    const existingUser = await getUserById(supabase, targetUserId, requestingUserId, profile);
    if (existingUser.error || !existingUser.data) {
      return {
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND',
      };
    }

    // Update user via repository
    const result = await updateUserProfile(supabase, targetUserId, input);

    if (result.error) {
      return {
        success: false,
        error: result.error,
        code: 'INTERNAL_ERROR',
      };
    }

    if (!result.data) {
      return {
        success: false,
        error: 'Failed to update user',
        code: 'INTERNAL_ERROR',
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    logger.error('Error in updateUser:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Delete a user profile
 */
export async function deleteUser(
  supabase: SupabaseClient,
  requestingUserId: string,
  profile: Profile,
  targetUserId: string
): Promise<ServiceResult<void>> {
  try {
    // Get allowed student IDs for teachers
    let allowedStudentIds: string[] | undefined;
    if (profile.isTeacher && !profile.isAdmin) {
      allowedStudentIds = await getStudentIdsForTeacher(supabase, requestingUserId);
    }

    // Check authorization
    const authCheck = canDeleteUser(requestingUserId, profile, targetUserId, allowedStudentIds);
    if (!authCheck.allowed) {
      return {
        success: false,
        error: authCheck.reason,
        code: 'FORBIDDEN',
      };
    }

    // Check if user exists
    const existingUser = await getUserById(supabase, targetUserId, requestingUserId, profile);
    if (existingUser.error || !existingUser.data) {
      return {
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND',
      };
    }

    // Delete user via repository
    const result = await deleteUserProfile(supabase, targetUserId);

    if (result.error) {
      return {
        success: false,
        error: result.error,
        code: 'INTERNAL_ERROR',
      };
    }

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    logger.error('Error in deleteUser:', error);
    return {
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }
}
