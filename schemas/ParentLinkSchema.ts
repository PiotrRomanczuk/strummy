import { z } from 'zod';

/** A teacher links a parent to a student and invites them by e-mail. */
export const ParentInviteSchema = z.object({
  studentId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
});
export type ParentInviteInput = z.input<typeof ParentInviteSchema>;

export const StudentIdSchema = z.object({ studentId: z.string().uuid() });
