import '@/app/design-tokens.css';

import type { Metadata } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Beta notice — Strummy',
  description: 'What public beta means, what Strummy stores, and how to have it deleted.',
};

const CONTACT = 'p.romanczuk@gmail.com';

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: 'What "public beta" means here',
    body: [
      'Strummy is built and run by one working guitar teacher, and it is used in a real teaching studio every week. It is not a finished commercial product. Features change, occasionally break, and are sometimes removed.',
      'Everything is free during the beta. There is no card on file and no feature gating. If paid tiers arrive, teachers already using a feature keep access to it.',
      'There is no uptime guarantee. Treat Strummy as the convenient copy of your teaching records, not the only copy.',
    ],
  },
  {
    heading: 'What is stored',
    body: [
      'Account details: your name, email address, and role (teacher, student, parent, admin).',
      'Teaching records: lessons and their notes, assignments, song repertoire and progress, practice logs, and — if you connect it — lesson events synced from your Google Calendar.',
      'Operational records: sign-in events and an audit trail of changes to lessons, assignments and profiles, kept so problems can be diagnosed.',
      'Text you send to the AI assistant, along with the reply, so the output can be reviewed later. Do not paste anything into it you would not want stored.',
    ],
  },
  {
    heading: 'Where it is stored',
    body: [
      'On a self-hosted PostgreSQL database on hardware in Warsaw, Poland, reached over an encrypted tunnel. The web application runs on Vercel. Nightly encrypted backups are kept off-site.',
      'Data is not sold, and it is not shared with anyone beyond the infrastructure providers named above.',
    ],
  },
  {
    heading: 'Students under 18',
    body: [
      'A student account is created by their teacher, by invitation. If the student is a minor, the teacher is responsible for obtaining parental consent before entering that student’s details.',
      'A parent can ask for their child’s records at any time using the address below, and they will be exported or deleted.',
    ],
  },
  {
    heading: 'Getting your data out, or deleted',
    body: [
      `Email ${CONTACT} and say which you want. An export comes back as a readable file; a deletion removes your account and the records attached to it, and cannot be undone.`,
      'Either request is handled by a person, usually within a few days — there is no automated self-service flow for this yet.',
    ],
  },
];

export default function BetaNoticePage() {
  return (
    <div
      className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}
      style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh' }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '56px 24px 96px' }}>
        <Link href="/" style={{ color: 'var(--ink-3)', fontSize: 13, textDecoration: 'none' }}>
          ← Strummy
        </Link>

        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 38,
            letterSpacing: '-0.02em',
            margin: '22px 0 8px',
          }}
        >
          Beta notice
        </h1>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6, marginBottom: 40 }}>
          Plain-language answers to what Strummy is, what it keeps, and how to get your records back
          or removed.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.heading} style={{ marginBottom: 34 }}>
            <h2
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                letterSpacing: '.16em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
                marginBottom: 12,
              }}
            >
              {section.heading}
            </h2>
            {section.body.map((paragraph) => (
              <p
                key={paragraph}
                style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--ink-2)', marginBottom: 12 }}
              >
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <p style={{ fontSize: 13, color: 'var(--ink-4)', lineHeight: 1.6 }}>
          Questions about any of this go to{' '}
          <a href={`mailto:${CONTACT}`} style={{ color: 'var(--ink-2)' }}>
            {CONTACT}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
