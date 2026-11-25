import { useFormatter, useTranslations } from 'next-intl';

import type { SongRequestWithStudent } from '@/schemas/SongRequestSchema';

import { SongRequestActions } from './SongRequestActions';

/** One pending request in the teacher's queue; the date follows the viewer's locale. */
export const SongRequestCard = ({ request }: { request: SongRequestWithStudent }) => {
  const t = useTranslations('Songs');
  const format = useFormatter();

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-lg text-gray-900">{request.title}</h3>
          {request.artist && (
            <span className="text-gray-500">
              {t('requestByArtist', { artist: request.artist })}
            </span>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {t('requestedBy')}{' '}
          <span className="font-medium text-gray-700">
            {request.student?.full_name || t('requestUnknownStudent')}
          </span>
          {' • '}
          {format.dateTime(new Date(request.created_at), { dateStyle: 'medium' })}
        </div>

        {request.url && (
          <a
            href={request.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline block truncate max-w-md"
          >
            {request.url}
          </a>
        )}

        {request.notes && (
          <div className="text-sm bg-gray-50 p-3 rounded-md mt-2 italic text-gray-700">
            &ldquo;{request.notes}&rdquo;
          </div>
        )}
      </div>

      <div className="shrink-0 mt-4 sm:mt-0">
        <SongRequestActions requestId={request.id} />
      </div>
    </div>
  );
};
