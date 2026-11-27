import { getFormatter, getTranslations } from 'next-intl/server';

import { TableCell, TableRow } from '@/components/ui/table';
import type { TeacherLeadListItem } from '@/lib/services/teacher-leads-queries';

import { TeacherLeadsReplyButton } from './TeacherLeads.ReplyButton';
import { isLeadHandled } from './teacher-leads.helpers';

const KNOWN_LOCALES = ['pl', 'en'];

/** One lead: date, name, address, language, source, status and the reply toggle. */
export async function TeacherLeadsRow({ lead }: { lead: TeacherLeadListItem }) {
  const [t, format] = await Promise.all([getTranslations('TeacherLeads'), getFormatter()]);
  const isHandled = isLeadHandled(lead.status);
  const language =
    lead.locale && KNOWN_LOCALES.includes(lead.locale) ? t(`locale.${lead.locale}`) : lead.locale;

  return (
    <TableRow data-testid="teacher-lead-row" data-status={lead.status}>
      <TableCell className="whitespace-nowrap text-[13px] text-[var(--ink-3)]">
        <time dateTime={lead.created_at}>
          {format.dateTime(new Date(lead.created_at), { dateStyle: 'medium', timeStyle: 'short' })}
        </time>
      </TableCell>
      <TableCell className="font-medium text-[var(--ink)]">{lead.full_name}</TableCell>
      <TableCell>
        <a
          href={`mailto:${lead.email}`}
          className="text-[var(--ink-2)] underline-offset-4 hover:underline"
        >
          {lead.email}
        </a>
      </TableCell>
      <TableCell className="text-[var(--ink-3)]">{language ?? '—'}</TableCell>
      <TableCell className="text-[var(--ink-3)]">{lead.source ?? '—'}</TableCell>
      <TableCell>
        <span
          className={`inline-flex rounded-full border px-2 py-0.5 text-[12px] ${
            isHandled
              ? 'border-[var(--rule)] text-[var(--ink-4)]'
              : 'border-[var(--gold-dim)] bg-[var(--gold-tint)] text-[var(--gold-2)]'
          }`}
        >
          {t(`status.${lead.status}`)}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <TeacherLeadsReplyButton leadId={lead.id} isHandled={isHandled} leadName={lead.full_name} />
      </TableCell>
    </TableRow>
  );
}
