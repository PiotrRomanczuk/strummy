import { getTranslations } from 'next-intl/server';

import { SCHOOL_CONTACT } from './for-schools.data';

/**
 * The page's only conversion step: mail or phone, straight to a person.
 *
 * Not `CtaLink` from the landing primitives — that marks anything non-internal
 * `target="_blank"`, which is wrong for `mailto:` and `tel:` (a blank tab is
 * left behind after the handler opens). Same `ui-land-btn` skin, no target.
 */
export const ContactCta = async ({
  kind,
  variant = 'primary',
  children,
}: {
  kind: 'email' | 'phone';
  variant?: 'primary' | 'ghost';
  children: React.ReactNode;
}) => {
  const t = await getTranslations('ForSchools.contact');
  const href =
    kind === 'email'
      ? `mailto:${SCHOOL_CONTACT.email}?subject=${encodeURIComponent(t('emailSubject'))}`
      : SCHOOL_CONTACT.phoneHref;

  return (
    <a
      href={href}
      data-testid={`for-schools-${kind}-cta`}
      className={`ui-land-btn ui-land-btn--${variant} is-lg`}
    >
      {children}
    </a>
  );
};
