import { CircleCheck, Flame, Music } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SHOW_PRACTICE_FEATURES } from '@/lib/config/features';
import type { ParentChildOverview } from '@/lib/services/parent-dashboard-queries';
import { formatPracticeMinutes } from '@/lib/services/parent-health.helpers';

import { SectionLabel, StatChip } from './parent-dashboard.shared';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

/** The child's name, level and teacher, with the stat chips beside it. */
export const ParentDashboardHero = ({ child }: { child: ParentChildOverview }) => {
  const t = useTranslations('ParentHome');
  const subtitle = [
    child.skillLevel,
    child.teacherName ? t('withTeacher', { name: child.teacherName }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div
        aria-hidden="true"
        className="grid size-16 place-items-center rounded-full border border-[var(--gold-dim)] bg-[var(--gold-tint)] font-serif text-[22px] font-semibold text-[var(--gold-2)]"
      >
        {initialsOf(child.name)}
      </div>
      <div className="min-w-[220px] flex-1">
        <div className="mb-1.5">
          <SectionLabel>{t('checkingIn')}</SectionLabel>
        </div>
        <h1 className="m-0 truncate font-serif text-[30px] font-normal tracking-[-0.02em]">
          {child.name}
        </h1>
        {subtitle && <div className="mt-1 text-sm text-[var(--ink-3)]">{subtitle}</div>}
      </div>
      <div className="flex flex-wrap gap-3">
        {/* Streak and this-week minutes both read off practice_sessions, so
            only the song count survives with practice hidden. */}
        {SHOW_PRACTICE_FEATURES && (
          <StatChip
            value={String(child.streakDays)}
            label={t('streakLabel', { count: child.streakDays })}
            tone="gold"
            icon={<Flame size={14} />}
          />
        )}
        <StatChip
          value={String(child.songCount)}
          label={t('songsLabel', { count: child.songCount })}
          icon={<Music size={14} />}
        />
        {SHOW_PRACTICE_FEATURES && (
          <StatChip
            value={formatPracticeMinutes(child.practiceWeek.totalMinutes)}
            label={t('thisWeek')}
            tone="success"
            icon={<CircleCheck size={14} />}
          />
        )}
      </div>
    </div>
  );
};
