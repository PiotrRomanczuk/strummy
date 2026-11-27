import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import type { StudentProfile } from '@/lib/services/student-detail-queries';

import { ArchiveStudentButton } from './ArchiveStudentButton';

/** Edit + Archive/Restore on the student card, for an admin or the student's teacher (#1178). */
export const HeaderManage = async ({ profile }: { profile: StudentProfile }) => {
  const t = await getTranslations('Users');
  return (
    <>
      <Link
        href={`/dashboard/users/${profile.id}/edit`}
        className="inline-flex items-center gap-1.5 text-[var(--ink-3)] no-underline hover:text-[var(--ink)]"
      >
        <Pencil size={13} aria-hidden="true" /> {t('detailEditLink')}
      </Link>
      <ArchiveStudentButton userId={profile.id} isArchived={profile.studentStatus === 'archived'} />
    </>
  );
};
