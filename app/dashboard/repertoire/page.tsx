import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getStudentRepertoireAction } from '@/app/actions/repertoire';
import { Repertoire } from '@/components/repertoire';
import {
  DEFAULT_SORT,
  SORTS,
  STAGES,
  type RepertoireFilters,
  type Stage,
} from '@/components/repertoire/repertoire-filters.helpers';
import { readEnumParam, readParam } from '@/components/shared/list-filters.helpers';

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

/**
 * Repertoire page (spec 05). Shows the signed-in student's repertoire via
 * RLS-scoped `getStudentRepertoireAction`. Students may edit own notes +
 * difficulty inline (the action whitelists those keys for non-staff callers).
 */
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function RepertoirePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  // An unrecognised ?stage= is dropped rather than passed through — otherwise
  // a typo'd URL silently renders an empty repertoire with no explanation.
  const rawStage = readParam(params.stage);
  const filters: RepertoireFilters = {
    search: readParam(params.search),
    stage: STAGES.includes(rawStage as Stage) ? (rawStage as Stage) : undefined,
    sort: readEnumParam(params.sort, SORTS, DEFAULT_SORT),
  };

  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in');

  // student_repertoire.student_id is a PROFILE id. Passing `user.id` (the auth
  // id) returned an empty repertoire for every account created after S2 —
  // including every claimed shadow student, whose songs were sitting right
  // there in the table.
  const result = await getStudentRepertoireAction(profileId);
  const entries = 'data' in result ? result.data : [];

  // Staff viewing their OWN /dashboard/repertoire is rare; the per-student
  // teacher edit-all flow lives on the student profile. Here a non-staff viewer
  // (student) gets inline self-edit of notes + difficulty.
  const canEdit = !isAdmin && !isTeacher;

  // The theme wrapper is load-bearing, not cosmetic: every `ui-*` rule —
  // including the shared DataList grid — is scoped under `.theme-strummy`, so
  // without it the table silently renders as a single stacked column. The old
  // `max-w-2xl` shell also could not hold a five-column table.
  return (
    <div className={`theme-strummy ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}>
      <Repertoire entries={entries} canEdit={canEdit} filters={filters} />
    </div>
  );
}
