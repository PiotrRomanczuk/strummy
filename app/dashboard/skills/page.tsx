import '@/app/design-tokens.css';

import { getTranslations } from 'next-intl/server';

import { getChordsDueCount } from '@/app/actions/chord-srs';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { PracticeToolCard } from '@/components/skills/PracticeToolCard';

/**
 * Practice-tools hub (CHT-2). Un-orphans the chord quiz — previously reachable
 * only by direct URL behind a "Coming soon" stub. Teachers assign a chord drill
 * from any assignment (ASG-4); this hub is the standalone way in.
 *
 * Restyled into the Strummy design language 2026-08-15: it was the last
 * `/dashboard` page still rendering raw shadcn on the default canvas, sitting
 * one nav slot from `/dashboard/fretboard`, and its copy was hardcoded English —
 * invisible to check C22, which only scans `components/`, never `app/`.
 *
 * Not to be confused with the skill-assessment checklist (doc 11); this route
 * owns practice tools only. See the SKL-2 note in `menu.constants.ts`.
 */
export default async function Page() {
  const t = await getTranslations('Skills');
  const due = await getChordsDueCount();
  const dueCount = 'count' in due ? due.count : 0;

  return (
    // `.theme-strummy` paints `background: var(--ivory)` on itself, so it covers
    // only its own box. This page is a single card tall, which left the canvas
    // half ivory and half the layout's default below it. Taller themed pages hide
    // the same seam by filling the viewport with content.
    <div className={themeFontClass} style={{ minHeight: '100%' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 22px 40px' }}>
        <header style={{ marginBottom: 22 }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              color: 'var(--gold-2)',
              marginBottom: 8,
            }}
          >
            {t('hubEyebrow')}
          </div>
          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            {t('hubTitle')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: '6px 0 0' }}>{t('hubIntro')}</p>
        </header>

        <PracticeToolCard
          href="/dashboard/skills/chord-quiz"
          title={t('hubChordQuizTitle')}
          body={t('hubChordQuizBody')}
          badge={dueCount > 0 ? t('hubDueCount', { count: dueCount }) : undefined}
        />
      </div>
    </div>
  );
}
