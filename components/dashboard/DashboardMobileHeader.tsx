import { getLocale, getTranslations } from 'next-intl/server';

import { StudentInitials } from '@/components/lessons/LessonPrimitives';

import { greetingName } from './greeting.helpers';

type Props = {
  fullName: string | null;
  email: string;
  now: Date;
  /** Avatar fill; the teacher mockup uses ink, the student one a colour. */
  avatarColor?: string | null;
};

const eyebrow = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '.16em',
  color: 'var(--ink-4)',
} as const;

/** Phone-only dashboard header from the mobile mockups: date, "Hi, Name", avatar. */
export async function DashboardMobileHeader({ fullName, email, now, avatarColor }: Props) {
  const [t, locale] = await Promise.all([getTranslations('Dashboard'), getLocale()]);
  // "Tuesday · Oct 13" / "wtorek · 13 paź" — same shape, the viewer's language.
  const date = now
    .toLocaleDateString(locale.startsWith('en') ? 'en-US' : locale, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    .replace(',', ' ·');
  return (
    <div
      className="flex items-center justify-between md:hidden"
      style={{ padding: '8px 4px 12px' }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={eyebrow}>{date}</div>
        {/* The page heading on phones: the desktop h1 is `hidden md:block`. */}
        <h1
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 24,
            fontWeight: 400,
            margin: '2px 0 0',
            letterSpacing: '-0.02em',
            overflowWrap: 'anywhere',
          }}
        >
          {t('hi')} <em style={{ color: 'var(--gold-2)' }}>{greetingName(fullName, email)}</em>
        </h1>
      </div>
      <StudentInitials name={fullName} email={email} size={36} color={avatarColor} />
    </div>
  );
}
