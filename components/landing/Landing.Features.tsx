import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';

import { ScreenshotShot } from './Landing.frames';
import { FeatureShotStudent } from './Landing.FeatureShot';
import { Display, Eyebrow, LandingContainer, SectionKicker } from './Landing.primitives';
import { LandingHoverLift, LandingReveal } from './Landing.Reveal';

type Feature = {
  n: string;
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  shot: ReactNode;
};

async function getFeatures(): Promise<Feature[]> {
  const t = await getTranslations('Landing.features');

  return [
    {
      n: '01',
      kicker: t('feature0Kicker'),
      title: t('feature0Title'),
      body: t('feature0Body'),
      bullets: [t('feature0Bullet0'), t('feature0Bullet1'), t('feature0Bullet2')],
      shot: <FeatureShotStudent />,
    },
    {
      n: '02',
      kicker: t('feature1Kicker'),
      title: t('feature1Title'),
      body: t('feature1Body'),
      bullets: [t('feature1Bullet0'), t('feature1Bullet1'), t('feature1Bullet2')],
      shot: (
        <ScreenshotShot
          src="/screenshots/lessons.png"
          alt={t('feature1Alt')}
          url="strummy.online/dashboard/lessons"
        />
      ),
    },
    {
      n: '03',
      kicker: t('feature2Kicker'),
      title: t('feature2Title'),
      body: t('feature2Body'),
      bullets: [t('feature2Bullet0'), t('feature2Bullet1'), t('feature2Bullet2')],
      shot: (
        <ScreenshotShot
          src="/screenshots/songs.png"
          alt={t('feature2Alt')}
          url="strummy.online/dashboard/songs"
        />
      ),
    },
    {
      n: '04',
      kicker: t('feature3Kicker'),
      title: t('feature3Title'),
      body: t('feature3Body'),
      bullets: [t('feature3Bullet0'), t('feature3Bullet1'), t('feature3Bullet2')],
      shot: (
        <ScreenshotShot
          src="/screenshots/fretboard.png"
          alt={t('feature3Alt')}
          url="strummy.online/dashboard/fretboard"
        />
      ),
    },
  ];
}

const FeatureBullets = ({ bullets }: { bullets: string[] }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {bullets.map((b) => (
      <div
        key={b}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 14,
          color: 'var(--ink-2)',
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'var(--gold-tint)',
            color: 'var(--gold-2)',
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 18px',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12l5 5L20 7" />
          </svg>
        </span>
        {b}
      </div>
    ))}
  </div>
);

const FeatureRow = ({ f, isFlipped }: { f: Feature; isFlipped: boolean }) => (
  <LandingReveal>
    <div style={{ padding: '72px 0', borderTop: '1px solid var(--rule)' }}>
      <div className={`ui-land-feature-grid${isFlipped ? ' is-flipped' : ''}`}>
        <div className="ui-land-feature-copy">
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 52,
              color: 'var(--gold-dim)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            {f.n}
          </div>
          <Eyebrow style={{ marginBottom: 14, color: 'var(--gold-2)' }}>{f.kicker}</Eyebrow>
          <Display sizeClass="ui-land-display-44" style={{ marginBottom: 16, maxWidth: 460 }}>
            {f.title}
          </Display>
          <div
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: 'var(--ink-3)',
              maxWidth: 460,
              marginBottom: 22,
              textWrap: 'pretty',
            }}
          >
            {f.body}
          </div>
          <FeatureBullets bullets={f.bullets} />
        </div>

        <LandingHoverLift>
          <div className="ui-land-feature-shot">{f.shot}</div>
        </LandingHoverLift>
      </div>
    </div>
  </LandingReveal>
);

/** Four alternating feature showcases. */
export const FeatureShowcases = async () => {
  const t = await getTranslations('Landing.features');
  const features = await getFeatures();

  return (
    <div
      id="features"
      style={{ padding: '60px 0 120px', background: 'var(--paper)', scrollMarginTop: 80 }}
    >
      <LandingContainer>
        <div
          style={{ textAlign: 'center', padding: '40px 0 20px', maxWidth: 780, margin: '0 auto' }}
        >
          <SectionKicker align="center">{t('kicker')}</SectionKicker>
          <Display sizeClass="ui-land-display-56" align="center" style={{ marginBottom: 18 }}>
            {t('headlinePrefix')}
            <em style={{ color: 'var(--gold-2)' }}>{t('headlineEmphasis')}</em>
            {t('headlineSuffix')}
          </Display>
        </div>
        {features.map((f, i) => (
          <FeatureRow key={f.n} f={f} isFlipped={i % 2 === 1} />
        ))}
      </LandingContainer>
    </div>
  );
};
