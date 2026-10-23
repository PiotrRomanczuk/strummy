import type { QualityBand } from '@/lib/data-quality/quality.types';

import { BAND_PILL_CLASS } from './data-quality.styles';

type Props = { score: number; band: QualityBand; label?: string };

export function QualityScorePill({ score, band, label }: Props) {
  return (
    <span
      className={`inline-flex min-w-11 items-center justify-center rounded-full px-2 py-0.5 font-mono text-xs font-semibold tabular-nums ${BAND_PILL_CLASS[band]}`}
      aria-label={label ? `${label}: ${score}` : String(score)}
    >
      {score}
    </span>
  );
}
