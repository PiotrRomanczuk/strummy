'use server';

import { headers } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import transporter, { MAIL_FROM, MAIL_REPLY_TO, isSmtpConfigured } from '@/lib/email/smtp-client';
import { LOCALE_COOKIE, isAppLocale, resolveLocaleFromAcceptLanguage } from '@/i18n/locales';
import { TeacherLeadFormSchema, type TeacherLeadFormData } from '@/schemas/TeacherLeadSchema';
import { cookies } from 'next/headers';

export interface SubmitTeacherLeadResult {
  success: boolean;
  /** i18n key, not prose — the form renders it through next-intl. */
  error?: string;
}

/**
 * Public interest form. Callable with no session at all, and deliberately NOT
 * behind `guardTestAccountMutation`: a visitor signed into the demo studio is
 * exactly who this form is for, and the guard would silently reject them.
 *
 * All validation that matters is re-done inside `submit_teacher_lead()` — this
 * layer is for the error messages, not for the security boundary.
 */
export async function submitTeacherLead(
  formData: TeacherLeadFormData
): Promise<SubmitTeacherLeadResult> {
  const parsed = TeacherLeadFormSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'validation.generic' };
  }

  // Honeypot: report success so a bot has nothing to tune against, and write
  // nothing. A real submission can never populate this field.
  if (parsed.data.website) {
    logger.info('[teacher-leads] honeypot submission dropped');
    return { success: true };
  }

  const locale = await resolveLocale();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('submit_teacher_lead', {
    p_full_name: parsed.data.fullName,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone || null,
    p_teaching_context: parsed.data.teachingContext ?? null,
    p_student_count: parsed.data.studentCount ?? null,
    p_biggest_pain: parsed.data.biggestPain || null,
    p_wants_contact: parsed.data.wantsContact,
    p_source: parsed.data.source || null,
    p_locale: locale,
  });

  if (error) {
    // The function raises check_violation for both bad input and the hourly
    // cap; the cap is the only one a valid form can hit, so say so.
    const isRateLimited = error.message.includes('too many submissions');
    logger.error('[teacher-leads] submit failed', { message: error.message });
    return { success: false, error: isRateLimited ? 'errors.rateLimited' : 'errors.generic' };
  }

  // Best-effort: a lead is already safely stored, so a dead SMTP relay must not
  // turn a successful submission into a visible failure.
  void notifyOwner(parsed.data, String(data), locale).catch((notifyError) => {
    logger.error('[teacher-leads] owner notification failed', {
      message: notifyError instanceof Error ? notifyError.message : String(notifyError),
    });
  });

  return { success: true };
}

async function resolveLocale(): Promise<string> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;
  return resolveLocaleFromAcceptLanguage((await headers()).get('accept-language'));
}

async function notifyOwner(
  lead: {
    fullName: string;
    email: string;
    phone?: string;
    teachingContext?: string;
    studentCount?: string;
    biggestPain?: string;
    wantsContact: boolean;
    source?: string;
  },
  leadId: string,
  locale: string
): Promise<void> {
  if (!isSmtpConfigured()) {
    logger.warn('[teacher-leads] SMTP not configured — skipping owner notification');
    return;
  }

  const rows: [string, string][] = [
    ['Imię i nazwisko', lead.fullName],
    ['E-mail', lead.email],
    ['Telefon', lead.phone || '—'],
    ['Gdzie uczy', lead.teachingContext || '—'],
    ['Liczba uczniów', lead.studentCount || '—'],
    ['Największy problem', lead.biggestPain || '—'],
    ['Zgoda na kontakt', lead.wantsContact ? 'tak' : 'nie'],
    ['Źródło', lead.source || '—'],
    ['Język', locale],
    ['ID', leadId],
  ];

  await transporter.sendMail({
    from: MAIL_FROM,
    to: MAIL_REPLY_TO,
    replyTo: lead.email,
    subject: `Nowy nauczyciel zainteresowany Strummy: ${lead.fullName}`,
    text: rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
    html: `<table cellpadding="6" style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">${rows
      .map(
        ([label, value]) =>
          `<tr><td style="color:#666">${escapeHtml(label)}</td><td><strong>${escapeHtml(value)}</strong></td></tr>`
      )
      .join('')}</table>`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
