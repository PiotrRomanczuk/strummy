import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { getSongRequests } from '@/app/actions/song-requests';
import { SongRequestActions } from '@/components/songs/requests/SongRequestActions';
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
            <div
              key={req.id}
              className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-lg text-gray-900">{req.title}</h3>
                  {req.artist && <span className="text-gray-500">by {req.artist}</span>}
                </div>

                <div className="text-sm text-gray-500">
                  Requested by{' '}
                  <span className="font-medium text-gray-700">
                    {req.student?.full_name || 'Unknown Student'}
                  </span>
                  {' • '}
                  {new Date(req.created_at).toLocaleDateString('en-US')}
                </div>

                {req.url && (
                  <a
                    href={req.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline block truncate max-w-md"
                  >
                    {req.url}
                  </a>
                )}

                {req.notes && (
                  <div className="text-sm bg-gray-50 p-3 rounded-md mt-2 italic text-gray-700">
                    &ldquo;{req.notes}&rdquo;
                  </div>
                )}
              </div>

              <div className="shrink-0 mt-4 sm:mt-0">
                <SongRequestActions requestId={req.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
