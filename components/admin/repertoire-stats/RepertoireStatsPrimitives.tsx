import type { ReactNode } from 'react';
import {
  AudioWaveform,
  CircleCheck,
  CircleX,
  Info,
  Link2,
  Music,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { FieldMark } from '@/lib/repertoire-stats/mismatch-list';

/** The mono uppercase eyebrow of the Strummy layer. */
export function StatsLabel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.13em] text-[var(--ink-4)] ${className}`}
    >
      {children}
    </div>
  );
}

export function StatsCard({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-[10px] border border-[var(--rule)] bg-[var(--card)] ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHead({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-serif text-[20px] font-medium leading-tight tracking-[-0.01em]">
          {title}
        </h2>
        {sub && <div className="mt-1 text-[var(--ink-3)]">{sub}</div>}
      </div>
      {right && <div className="shrink-0 whitespace-nowrap">{right}</div>}
    </div>
  );
}

const MARKS: Record<Exclude<FieldMark, null>, { icon: LucideIcon; tone: string }> = {
  ok: { icon: CircleCheck, tone: 'text-[var(--success)]' },
  error: { icon: CircleX, tone: 'text-[var(--danger)]' },
  review: { icon: TriangleAlert, tone: 'text-[var(--gold-2)]' },
  explained: { icon: Info, tone: 'text-[var(--ink-4)]' },
};

/** A verdict: always an icon and a word, never the colour alone. */
export function StatusText({
  mark,
  children,
}: {
  mark: Exclude<FieldMark, null>;
  children: ReactNode;
}) {
  const { icon: Icon, tone } = MARKS[mark];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[12.5px] ${mark === 'explained' ? 'text-[var(--ink-3)]' : `font-medium ${tone}`}`}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      {children}
    </span>
  );
}

/** The icon alone, for tight table cells; the word is in its title and in the legend above the table. */
export function MarkIcon({ mark, label }: { mark: FieldMark; label: string }) {
  if (!mark) return <span className="text-[var(--ink-5)]">–</span>;
  const { icon: Icon, tone } = MARKS[mark];
  return (
    <span title={label} className={`inline-flex ${tone}`}>
      <Icon aria-label={label} className="size-3.5" />
    </span>
  );
}

export function ReasonTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[var(--rule)] px-2 py-0.5 text-[11.5px] text-[var(--ink-3)]">
      <Info aria-hidden className="size-3" />
      {children}
    </span>
  );
}

export { ChordChip, ChordList, Degrees } from './RepertoireStatsChords';

/** A thin bar; the fill is at least 1% wide so that 9 of 468 still shows. */
export function MeterBar({
  value,
  max,
  tone = 'bg-[var(--ink-5)]',
  thick = false,
}: {
  value: number;
  max: number;
  tone?: string;
  thick?: boolean;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 1 : 0) : 0;
  return (
    <div className={`rounded-full bg-[var(--rule-2)] ${thick ? 'h-2' : 'h-1.5'}`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function StudentCount({ count, label }: { count: number; label: string }) {
  return (
    <span
      title={label}
      className="inline-flex items-center gap-1 font-mono text-[12px] text-[var(--ink-3)]"
    >
      <Users aria-label={label} className="size-3" />
      {count}
    </span>
  );
}

/** Link, analysis and transcription as three icons, dimmed where missing. */
export function CoverageIcons({
  has,
  labels,
}: {
  has: [boolean, boolean, boolean];
  labels: [string, string, string];
}) {
  const icons = [Link2, AudioWaveform, Music];
  return (
    <span className="inline-flex gap-1.5">
      {icons.map((Icon, i) => (
        <span
          key={labels[i]}
          title={labels[i]}
          className={has[i] ? 'text-[var(--ink-2)]' : 'text-[var(--ink-5)]'}
        >
          <Icon aria-label={labels[i]} className="size-3.5" />
        </span>
      ))}
    </span>
  );
}
