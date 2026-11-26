import '@/app/design-tokens.css';

import { redirect } from 'next/navigation';

import { ChordMap } from '@/components/chord-map';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getChordMapCatalogue, getKnownShapes } from '@/lib/services/chord-map-queries';
import { getStudentFeatures } from '@/lib/services/student-feature-access';

/**
 * A student's own chord map (Mapa nauki, view 1). Off until the teacher turns
 * on `chord-map` for this student — a beginner should not meet a ranking of
 * shapes before the first lesson explains what a shape is.
 *
 * Staff have no chords of their own: they open a student's map from the
 * student's page (`/dashboard/users/<id>/chord-map`).
 */
export default async function ChordMapPage() {
  const { user, profileId, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) redirect('/sign-in?redirect=/dashboard/chord-map');
  if (isAdmin || isTeacher) redirect('/dashboard/users');

  // `profileId`, never `user.id`: lessons and repertoire are keyed by profile.
  const features = await getStudentFeatures(profileId);
  if (!features.includes('chord-map')) redirect('/dashboard/repertoire');

  const [songs, known] = await Promise.all([getChordMapCatalogue(), getKnownShapes(profileId)]);

  return (
    <div className={`${themeFontClass} min-h-full bg-[var(--ivory)]`}>
      <ChordMap songs={songs} knownShapes={known.shapes} knownSongCount={known.songCount} />
    </div>
  );
}
