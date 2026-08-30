/**
 * Teacher Interest Lead Notification
 *
 * Sent to the owner when someone fills in the `/for-teachers` form.
 *
 * Reads as an internal notice, like `admin-error-alert`: a kicker, the lead's
 * name as the heading, their details in a card, and a reply button. Written in
 * Polish because it goes to one Polish inbox and the leads it reports on come
 * from a Polish campaign — unlike the student-facing templates, which are
 * localised per recipient.
 */

import {
  createCardSection,
  createDetailRow,
  createKicker,
  createListBox,
  createParagraph,
  createSectionHeading,
  createStatusBadge,
  generateBaseEmailHtml,
} from './base-template';

export interface TeacherLeadNotificationData {
  fullName: string;
  email: string;
  phone?: string | null;
  teachingContext?: string | null;
  studentCount?: string | null;
  biggestPain?: string | null;
  wantsContact: boolean;
  source?: string | null;
  locale?: string | null;
  leadId: string;
}

/**
 * The form posts machine values; nobody wants to read `private` or `6-15` in
 * their inbox. Unknown values fall through unchanged rather than vanishing —
 * a new option added to the form must not silently blank a field here.
 */
const TEACHING_CONTEXT_LABELS: Record<string, string> = {
  private: 'Prywatnie, własni uczniowie',
  school: 'W szkole muzycznej',
  online: 'Tylko online',
  mixed: 'Po trochu',
};

const STUDENT_COUNT_LABELS: Record<string, string> = {
  '1-5': '1–5 uczniów',
  '6-15': '6–15 uczniów',
  '16-30': '16–30 uczniów',
  '30+': 'Ponad 30 uczniów',
};

const LOCALE_LABELS: Record<string, string> = {
  pl: 'polski',
  en: 'angielski',
};

const EM_DASH = '&mdash;';

function label(value: string | null | undefined, map: Record<string, string>): string {
  if (!value) return EM_DASH;
  return map[value] ?? value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateTeacherLeadNotificationHtml(data: TeacherLeadNotificationData): string {
  const {
    fullName,
    email,
    phone,
    teachingContext,
    studentCount,
    biggestPain,
    wantsContact,
    source,
    locale,
    leadId,
  } = data;

  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);

  const bodyContent = `
    ${createKicker('Nowy kontakt &middot; Formularz dla nauczycieli')}
    ${createSectionHeading(safeName)}
    ${createParagraph(
      wantsContact
        ? 'Nauczyciel wypełnił formularz po obejrzeniu demo i zgodził się na kontakt.'
        : 'Nauczyciel wypełnił formularz po obejrzeniu demo, ale <strong>nie wyraził zgody na kontakt</strong>.'
    )}

    ${createCardSection(`
      ${createDetailRow(
        'E-mail',
        // Linked only when they agreed to be contacted. Without consent the
        // address is still shown — you need to know who wrote in — but reaching
        // them takes a deliberate copy-paste rather than one stray tap.
        wantsContact
          ? `<a href="mailto:${safeEmail}" style="color: #201f1d;">${safeEmail}</a>`
          : safeEmail
      )}
      ${createDetailRow('Telefon', phone ? escapeHtml(phone) : EM_DASH)}
      ${createDetailRow('Gdzie uczy', label(teachingContext, TEACHING_CONTEXT_LABELS))}
      ${createDetailRow('Liczba uczniów', label(studentCount, STUDENT_COUNT_LABELS))}
      ${createDetailRow('Skąd trafił', source ? escapeHtml(source) : EM_DASH)}
      ${createDetailRow('Język', label(locale, LOCALE_LABELS))}
      <div style="padding-top: 14px;">
        ${
          wantsContact
            ? createStatusBadge('Zgoda na kontakt', 'success')
            : createStatusBadge('Bez zgody na kontakt', 'urgent')
        }
      </div>
    `)}

    ${
      biggestPain
        ? createListBox('Co zjada mu najwięcej czasu', 1, [{ text: escapeHtml(biggestPain) }])
        : ''
    }
  `;

  return generateBaseEmailHtml({
    subject: `Nowy nauczyciel zainteresowany Strummy: ${fullName}`,
    preheader: biggestPain
      ? `${fullName} — ${biggestPain.slice(0, 80)}`
      : `${fullName} zostawił kontakt przez formularz.`,
    bodyContent,
    footerNote: `Zgłoszenie ${leadId}`,
    ...(wantsContact
      ? { ctaButton: { text: `Odpisz do ${fullName}`, url: `mailto:${email}` } }
      : {}),
  });
}
