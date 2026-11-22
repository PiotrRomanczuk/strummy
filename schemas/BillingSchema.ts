import { z } from 'zod';

/** One row of the teacher's price list, as typed in the form (price in zł text). */
export const LessonPackageInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  lessonCount: z.coerce.number().int().min(1).max(100),
  price: z.string().trim().min(1).max(12),
});
export type LessonPackageInput = z.input<typeof LessonPackageInputSchema>;

export const LessonPackageActiveSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export const BillingSettingsInputSchema = z.object({
  /** ISO date, or empty: lessons do not touch the balance. */
  billingStartOn: z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  paymentTermDays: z.coerce.number().int().min(0).max(90),
});
export type BillingSettingsInput = z.input<typeof BillingSettingsInputSchema>;

/** Sell one package from the teacher's price list to a student. */
export const PackagePurchaseCreateSchema = z.object({
  studentId: z.string().uuid(),
  packageId: z.string().uuid(),
});
export type PackagePurchaseCreateInput = z.input<typeof PackagePurchaseCreateSchema>;

/** How the money arrived when the teacher records it by hand. `infakt` is set by the sync only. */
export const MANUAL_PAYMENT_METHODS = ['transfer', 'cash', 'other'] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const PackagePurchasePaidSchema = z.object({
  purchaseId: z.string().uuid(),
  method: z.enum(MANUAL_PAYMENT_METHODS),
});
export type PackagePurchasePaidInput = z.input<typeof PackagePurchasePaidSchema>;

export const PackagePurchaseIdSchema = z.object({ purchaseId: z.string().uuid() });
