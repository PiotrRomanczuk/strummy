import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { ListPagination } from '@/components/shared/ListPagination';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TeacherLeadPage } from '@/lib/services/teacher-leads-queries';

import { TeacherLeadsRow } from './TeacherLeads.Row';
import {
  TEACHER_LEADS_FILTERS,
  teacherLeadsHref,
  totalPagesFor,
  type TeacherLeadsParams,
} from './teacher-leads.helpers';

type Props = { page: TeacherLeadPage; params: TeacherLeadsParams };

const COLUMNS = ['date', 'name', 'email', 'language', 'source', 'status'] as const;

const pill = (isActive: boolean) =>
  `inline-flex items-center rounded-full border px-3 py-1.5 text-[13px] ${
    isActive
      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
      : 'border-[var(--rule)] bg-[var(--card)] text-[var(--ink-3)] hover:border-[var(--ink-5)]'
  }`;

/** Admin list of `/for-teachers` leads: filter pills, the table and server-side pagination. */
export async function TeacherLeads({ page, params }: Props) {
  const t = await getTranslations('TeacherLeads');
  const totalPages = totalPagesFor(page.count);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-serif text-[34px] font-normal leading-[1.1] tracking-[-0.02em]">
          {t('title')}
        </h1>
        <p className="mt-1.5 text-[13px] text-[var(--ink-4)]">
          {t(params.filter === 'unhandled' ? 'countUnhandled' : 'countAll', { count: page.count })}
        </p>
      </header>

      <nav aria-label={t('filterLabel')} className="flex flex-wrap gap-2">
        {TEACHER_LEADS_FILTERS.map((filter) => (
          <Link
            key={filter}
            href={teacherLeadsHref({ filter }, params)}
            aria-current={params.filter === filter ? 'page' : undefined}
            className={pill(params.filter === filter)}
          >
            {t(`filter.${filter}`)}
          </Link>
        ))}
      </nav>

      {page.leads.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-[var(--rule)] px-4 py-10 text-center text-[13px] text-[var(--ink-4)]">
          {t(params.filter === 'unhandled' ? 'emptyUnhandled' : 'empty')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[10px] border border-[var(--rule)] bg-[var(--card)]">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead
                    key={column}
                    className="font-mono text-[10px] uppercase tracking-[.14em] text-[var(--ink-4)]"
                  >
                    {t(`column.${column}`)}
                  </TableHead>
                ))}
                <TableHead>
                  <span className="sr-only">{t('column.action')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.leads.map((lead) => (
                <TeacherLeadsRow key={lead.id} lead={lead} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ListPagination
        page={params.page}
        totalPages={totalPages}
        hrefForPage={(p) => teacherLeadsHref({ page: p }, params)}
        labels={{
          prev: t('prevPage'),
          next: t('nextPage'),
          status: t('pageOf', { page: params.page, total: totalPages }),
        }}
      />
    </div>
  );
}
