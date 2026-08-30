import * as z from 'zod';

/**
 * The interest form behind the public demo: a guitar teacher who has just
 * clicked through the demo studio telling us they'd want this for their own.
 *
 * Deliberately short. Every field beyond name and email is optional, because
 * the point of the form is to capture a warm lead in fifteen seconds, not to
 * qualify them — qualification happens in the reply.
 */

export const TeachingContextEnum = z.enum(['private', 'school', 'online', 'mixed']);
export type TeachingContext = z.infer<typeof TeachingContextEnum>;

export const StudentCountEnum = z.enum(['1-5', '6-15', '16-30', '30+']);
export type StudentCount = z.infer<typeof StudentCountEnum>;

export const TeacherLeadStatusEnum = z.enum(['new', 'contacted', 'converted', 'declined']);
export type TeacherLeadStatus = z.infer<typeof TeacherLeadStatusEnum>;

const optionalText = (max: number, message: string) =>
  z.string().max(max, message).optional().or(z.literal(''));

export const TeacherLeadFormSchema = z.object({
  fullName: z.string().trim().min(2, 'validation.nameRequired').max(120, 'validation.nameTooLong'),
  email: z.string().trim().email('validation.emailInvalid').max(200, 'validation.emailTooLong'),
  phone: optionalText(40, 'validation.phoneTooLong'),
  teachingContext: TeachingContextEnum.optional(),
  studentCount: StudentCountEnum.optional(),
  biggestPain: optionalText(1000, 'validation.painTooLong'),
  wantsContact: z.boolean().default(true),
  /** Where the click came from — set from `?source=` / `?utm_source=`, never typed. */
  source: optionalText(60, 'validation.sourceTooLong'),
  /**
   * Honeypot. Real people never see this field, so anything in it is a bot and
   * the submission is dropped — silently, so the bot cannot learn to skip it.
   */
  website: z.literal('').optional(),
});

export type TeacherLeadFormData = z.input<typeof TeacherLeadFormSchema>;
export type TeacherLeadFormValues = z.output<typeof TeacherLeadFormSchema>;

export type TeacherLeadRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  teaching_context: string | null;
  student_count: string | null;
  biggest_pain: string | null;
  wants_contact: boolean;
  source: string | null;
  locale: string | null;
  status: TeacherLeadStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};
