'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export type ProgressStudent = { id: string; name: string | null; email: string | null };

type Props = { students: ProgressStudent[]; studentId: string | null };

const displayName = (student: ProgressStudent) => student.name || student.email || student.id;

/** Whose progress the panel shows: kept in the address (`?student=`), so a lesson can link straight to it. */
export const SongCardProgressStudentSelect = ({ students, studentId }: Props) => {
  const t = useTranslations('SongProgress');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pick = (id: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (id) query.set('student', id);
    else query.delete('student');
    query.delete('lesson');
    const search = query.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--ink-3)]">
      {t('student')}
      <select
        value={studentId ?? ''}
        onChange={(event) => pick(event.target.value)}
        className="min-h-11 rounded-md border border-[var(--rule)] bg-[var(--card)] px-3 text-sm text-[var(--ink)]"
      >
        <option value="">{t('pickStudent')}</option>
        {students.map((student) => (
          <option key={student.id} value={student.id}>
            {displayName(student)}
          </option>
        ))}
      </select>
    </label>
  );
};
