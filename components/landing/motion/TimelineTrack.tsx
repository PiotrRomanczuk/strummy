'use client';

import { type ReactNode, useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { easeCine } from './easings';
import { useReducedMotionSafe } from './useReducedMotionSafe';

type Day = {
  label: string;
  description: string;
};

type Props = {
  days: Day[];
  className?: string;
  /** Optional render-prop override for a day card body. */
  renderDay?: (day: Day, index: number) => ReactNode;
};

export function TimelineTrack({ days, className, renderDay }: Props) {
  const reduced = useReducedMotionSafe();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref as React.RefObject<HTMLElement>,
    offset: ['start 0.8', 'end 0.4'],
  });
  const lineScale = useTransform(scrollYProgress, [0.05, 0.9], [0, 1]);

  // Rail spans the centers of the first and last dot — each dot is centred in
  // its grid column, so the centre of column `i` sits at `(i + 0.5) / total`.
  const railEdgePercent = 50 / days.length;
  const railStyle = {
    left: `${railEdgePercent}%`,
    right: `${railEdgePercent}%`,
  } as const;

  return (
    <div ref={ref} className={className}>
      {/* Desktop: horizontal rail with day cards below each dot */}
      <div className="relative hidden md:block">
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((day, i) => (
            <DesktopDay
              key={day.label}
              day={day}
              i={i}
              total={days.length}
              progress={scrollYProgress}
              renderDay={renderDay}
            />
          ))}
        </div>
        {/* Static rail (background) */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-3 h-px bg-[var(--l-rule)]"
          style={railStyle}
        />
        {/* Animated rail (foreground, fills left-to-right on scroll) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-3 h-px origin-left bg-[var(--l-ink)]"
          style={{ ...railStyle, scaleX: reduced ? 1 : lineScale }}
        />
      </div>

      {/* Mobile: vertical rail with cards stacked to its right */}
      <div className="relative md:hidden">
        <div aria-hidden className="absolute top-0 bottom-0 left-3 w-px bg-[var(--l-rule)]" />
        <motion.div
          aria-hidden
          className="absolute top-0 bottom-0 left-3 w-px origin-top bg-[var(--l-ink)]"
          style={{ scaleY: reduced ? 1 : lineScale }}
        />
        <div className="space-y-8 pl-10">
          {days.map((day) => (
            <div key={day.label} className="relative">
              <span
                aria-hidden
                className="absolute top-2 -left-[1.875rem] h-2.5 w-2.5 rounded-full bg-[var(--l-ink)] ring-4 ring-[var(--l-paper)]"
              />
              <h4 className="font-display text-xl">{day.label}</h4>
              <p className="mt-1 text-sm text-[var(--l-ink-3)]">{day.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopDay({
  day,
  i,
  total,
  progress,
  renderDay,
}: {
  day: Day;
  i: number;
  total: number;
  progress: MotionValue<number>;
  renderDay?: (day: Day, index: number) => ReactNode;
}) {
  const threshold = 0.1 + (i / Math.max(1, total - 1)) * 0.7;
  const dotScale = useTransform(progress, [threshold - 0.05, threshold + 0.05], [0, 1]);

  return (
    <motion.div
      initial={{ y: 24 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.2, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.7, delay: i * 0.08, ease: easeCine }}
      className="flex flex-col items-start px-2"
    >
      {/* Dot sitting on the shared rail */}
      <span
        aria-hidden
        className="relative z-10 mb-6 inline-flex h-6 w-6 items-center justify-center"
      >
        <motion.span
          className="block h-3 w-3 rounded-full bg-[var(--l-ink)] ring-4 ring-[var(--l-paper)]"
          style={{ scale: dotScale }}
        />
      </span>
      {/* Card */}
      <div className="max-w-[220px]">
        {renderDay ? (
          renderDay(day, i)
        ) : (
          <>
            <h4 className="font-display text-xl">{day.label}</h4>
            <p className="mt-2 text-sm text-[var(--l-ink-3)]">{day.description}</p>
          </>
        )}
      </div>
    </motion.div>
  );
}
