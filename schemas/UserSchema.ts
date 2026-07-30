import * as z from 'zod';
import { VALIDATION_KEYS as V } from './shared/validation-keys';

// User role enum
export const UserRoleEnum = z.enum(['student', 'teacher', 'admin']);

// User schema for validation
export const UserSchema = z.object({
  id: z.number().int().positive().optional(), // bigint, auto-generated
  user_id: z.string().uuid().optional(), // UUID from auth.users
  email: z.union([z.string().email(V.emailInvalid), z.literal('')]).optional(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().optional(),
  isStudent: z.boolean().default(true),
  isTeacher: z.boolean().default(false),
  isAdmin: z.boolean().default(false),
  isParent: z.boolean().default(false),
  isShadow: z.boolean().default(false).optional(),
  canEdit: z.boolean().default(false),
  isTest: z.boolean().default(false),
  isActive: z.boolean().default(true),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

// User input schema for creating/updating users
export const UserInputSchema = z.object({
  email: z.union([z.string().email(V.emailInvalid), z.literal('')]).optional(),
  username: z.string().optional(),
  firstName: z.string().min(1, V.firstNameRequired),
  lastName: z.string().optional(),
  bio: z.string().optional(),
  isStudent: z.boolean().optional(),
  isTeacher: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isShadow: z.boolean().optional(),
  canEdit: z.boolean().optional(),
  isTest: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isParent: z.boolean().optional(),
});

// User update schema (for partial updates)
export const UserUpdateSchema = UserInputSchema.partial().extend({
  id: z.number().int().positive(V.userIdRequired),
});

// User registration schema (for signup)
export const UserRegistrationSchema = z.object({
  email: z.string().email(V.emailInvalid),
  password: z.string().min(8, V.passwordMinLength),
  firstName: z.string().min(1, V.firstNameRequired),
  lastName: z.string().min(1, V.lastNameRequired),
  isStudent: z.boolean().default(true),
  isTeacher: z.boolean().default(false),
  isAdmin: z.boolean().default(false),
});

// User profile schema (for account management)
export const UserProfileSchema = z.object({
  full_name: z.string().optional(),
  username: z.string().optional(),
  website: z.string().url().optional(),
  avatar_url: z.string().url().optional(),
});

// User filter schema
export const UserFilterSchema = z.object({
  role: UserRoleEnum.optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
  isStudent: z.boolean().optional(),
  isTeacher: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  isParent: z.boolean().optional(),
});

// User sort schema
export const UserSortSchema = z.object({
  field: z.enum(['email', 'firstName', 'lastName', 'username', 'created_at', 'updated_at']),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

// User authentication schema
export const UserAuthSchema = z.object({
  email: z.string().email(V.emailInvalid),
  password: z.string().min(1, V.passwordRequired),
});

// User password reset schema
export const UserPasswordResetSchema = z.object({
  email: z.string().email(V.emailInvalid),
});

// User password change schema
export const UserPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, V.currentPasswordRequired),
    newPassword: z.string().min(8, V.newPasswordMinLength),
    confirmPassword: z.string().min(1, V.passwordConfirmationRequired),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: V.passwordsDontMatch,
    path: ['confirmPassword'],
  });

// Helper function to determine user role
export const getUserRole = (user: z.infer<typeof UserSchema>): z.infer<typeof UserRoleEnum> => {
  if (user.isAdmin) return 'admin';
  if (user.isTeacher) return 'teacher';
  // Parents without other roles default to student view
  return 'student';
};

// Helper function to check if user has permission
export const hasPermission = (
  user: z.infer<typeof UserSchema>,
  permission: 'edit' | 'admin' | 'teacher' | 'student' | 'parent'
): boolean => {
  switch (permission) {
    case 'edit':
      return user.canEdit || user.isAdmin;
    case 'admin':
      return user.isAdmin;
    case 'teacher':
      return user.isTeacher || user.isAdmin;
    case 'student':
      return user.isStudent;
    case 'parent':
      return user.isParent;
    default:
      return false;
  }
};

// Types
export type User = z.infer<typeof UserSchema>;
export type UserInput = z.infer<typeof UserInputSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type UserRegistration = z.infer<typeof UserRegistrationSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserFilter = z.infer<typeof UserFilterSchema>;
export type UserSort = z.infer<typeof UserSortSchema>;
export type UserAuth = z.infer<typeof UserAuthSchema>;
export type UserPasswordReset = z.infer<typeof UserPasswordResetSchema>;
export type UserPasswordChange = z.infer<typeof UserPasswordChangeSchema>;
export type UserRole = z.infer<typeof UserRoleEnum>;
