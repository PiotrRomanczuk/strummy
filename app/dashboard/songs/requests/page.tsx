import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongRequests } from '@/app/actions/song-requests';
import { SongRequestCard } from '@/components/songs/requests/SongRequestCard';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function SongRequestsPage() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/songs/requests');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/songs');
  }

  const t = await getTranslations('Songs');
  const { requests, error } = await getSongRequests('pending');

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard/songs"
          className="p-2 hover:bg-black/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <h1 className="text-2xl font-semibold font-serif italic text-gray-900">
          {t('pendingRequestsTitle')}
        </h1>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500 italic bg-white rounded-lg border border-gray-100 shadow-sm">
          {t('noPendingRequests')}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <SongRequestCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}
