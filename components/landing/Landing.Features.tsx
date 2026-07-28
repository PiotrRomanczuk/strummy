import type { ReactNode } from 'react';

import { ScreenshotShot } from './Landing.frames';
import { FeatureShotStudent } from './Landing.FeatureShot';
import { Display, Eyebrow, LandingContainer, SectionKicker } from './Landing.primitives';

type Feature = {
  n: string;
  kicker: string;
  title: string;
  body: string;
  bullets: string[];
  shot: ReactNode;
};

const FEATURES: Feature[] = [
  {
    n: '01',
    kicker: 'Students',
    title: 'Every student, their whole journey.',
    body: 'Profiles, lesson history, repertoire, skill progression, practice streaks, parent contacts — all on one page. The thing you kept meaning to build in Notion.',
    bullets: [
      'Lesson-by-lesson history',
      'Parent-ready progress view',
      'Skill-tracked songs & scales',
    ],
    shot: <FeatureShotStudent />,
  },
  {
    n: '02',
    kicker: 'Lessons',
    title: 'Schedule it. Run it. Move on.',
    body: "Google Calendar sync means no double-booked 4 o'clocks. Assignments and notes live on every session — when you close it, the record is already written.",
    bullets: [
      'Two-way Google Calendar sync',
      'Assignments with practice tracking',
      'AI-drafted lesson summaries',
    ],
    shot: (
      <ScreenshotShot
        src="/screenshots/lessons.png"
        alt="Lessons grouped by date with status filters and per-lesson song counts"
        url="strummy.vercel.app/dashboard/lessons"
      />
    ),
  },
  {
    n: '03',
    kicker: 'Library',
    title: 'Hundreds of songs, tabs already found.',
    body: "A shared song library with chords, tabs, and streaming links attached. Difficulty ratings. One click to add to a student's repertoire.",
    bullets: [
      'Ultimate Guitar tabs attached',
      'Spotify & YouTube links',
      'Shared across your whole studio',
    ],
    shot: (
      <ScreenshotShot
        src="/screenshots/songs.png"
        alt="Song library with difficulty levels, musical keys, and author filters"
        url="strummy.vercel.app/dashboard/songs"
      />
    ),
  },
  {
    n: '04',
    kicker: 'Fretboard',
    title: 'A fretboard that teaches theory.',
    body: 'Any scale or chord, any key — mapped and coloured across all six strings, with interval labels against the root. Tap a fret to name the note. Runs in any browser.',
    bullets: [
      'Every scale and chord, in every key',
      'Interval labels & root highlighting',
      'Tap a note to identify it',
    ],
    shot: (
      <ScreenshotShot
        src="/screenshots/fretboard.png"
        alt="Interactive fretboard mapping A minor pentatonic across all six strings"
        url="strummy.vercel.app/dashboard/fretboard"
      />
    ),
  },
];

const FeatureRow = ({ f, isFlipped }: { f: Feature; isFlipped: boolean }) => (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {f.bullets.map((b) => (
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
      </div>

      <div className="ui-land-feature-shot">{f.shot}</div>
    </div>
  </div>
);

/** Four alternating feature showcases. */
export const FeatureShowcases = () => (
  <div
    id="features"
    style={{ padding: '60px 0 120px', background: 'var(--paper)', scrollMarginTop: 80 }}
  >
    <LandingContainer>
      <div style={{ textAlign: 'center', padding: '40px 0 20px', maxWidth: 780, margin: '0 auto' }}>
        <SectionKicker align="center">The product</SectionKicker>
        <Display sizeClass="ui-land-display-56" align="center" style={{ marginBottom: 18 }}>
          Four corners of a <em style={{ color: 'var(--gold-2)' }}>teaching practice</em>.
        </Display>
      </div>
      {FEATURES.map((f, i) => (
        <FeatureRow key={f.n} f={f} isFlipped={i % 2 === 1} />
      ))}
    </LandingContainer>
  </div>
);
