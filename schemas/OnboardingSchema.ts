import { z } from 'zod';

/**
 * Schema for onboarding form validation.
 * Validates user preferences and learning goals during first-time setup.
 */
export const OnboardingSchema = z.object({
  role: z.enum(['student', 'teacher']).optional().default('student'),
  goals: z
    .array(z.string())
    .min(1, 'Please select at least one goal'),
  skillLevel: z.enum(['beginner', 'novice', 'intermediate', 'advanced'], {
    message: 'Please select your skill level',
  }),
  learningStyle: z
    .array(z.string())
    .optional()
    .default([]),
  instrumentPreference: z
    .array(z.string())
    .optional()
    .default([]),
});

/** Type inferred from OnboardingSchema for form data */
export type OnboardingFormData = z.infer<typeof OnboardingSchema>;
