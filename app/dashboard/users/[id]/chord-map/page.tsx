import '@/app/design-tokens.css';

import { notFound, redirect } from 'next/navigation';

import { ChordMap } from '@/components/chord-map';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getChordMapCatalogue, getKnownShapes } from '@/lib/services/chord-map-queries';
import { getStudentProfile } from '@/lib/services/student-detail-queries';

type PageProps = { params: Promise<{ id: string }> };

/**
 * One student's chord map, for their teacher: what the student plays today and
 * which shape to teach next. Shown whether or not the student sees it yet.
 * RLS decides whose lessons a teacher can read; an unknown id is a 404.
 */
export default async function StudentChordMapPage({ params }: PageProps) {
  const { id } = await params;
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();

  if (!user) redirect(`/sign-in?redirect=/dashboard/users/${id}/chord-map`);
  if (!isAdmin && !isTeacher) redirect('/dashboard/chord-map');

  const profile = await getStudentProfile(id);
  if (!profile) notFound();

  const [songs, known] = await Promise.all([getChordMapCatalogue(), getKnownShapes(id)]);

  return (
    <div className={`${themeFontClass} min-h-full bg-[var(--ivory)]`}>
      <ChordMap
        songs={songs}
        knownShapes={known.shapes}
        knownSongCount={known.songCount}
        studentName={profile.fullName ?? profile.email ?? id}
      />
    </div>
  );
}
