import type { QualityBand } from '@/lib/data-quality/quality.types';

/** Band → Tailwind classes. Semantic tokens exist in both the shadcn and Strummy themes. */
export const BAND_PILL_CLASS: Record<QualityBand, string> = {
  good: 'bg-success/15 text-success',
  fair: 'bg-warning/20 text-warning-foreground dark:text-warning',
  poor: 'bg-destructive/15 text-destructive',
};

export const BAND_LABEL_KEY: Record<QualityBand, 'bandGood' | 'bandFair' | 'bandPoor'> = {
  good: 'bandGood',
  fair: 'bandFair',
  poor: 'bandPoor',
};
