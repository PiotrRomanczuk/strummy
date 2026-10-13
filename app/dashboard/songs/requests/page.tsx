import '@/app/design-tokens.css';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { getSongRequests } from '@/app/actions/song-requests';
import { themeFontClass } from '@/components/shared/fonts.constants';
import { SongRequestActions } from '@/components/songs/requests/SongRequestActions';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';

/**
 * Pending song requests for the teacher. Editorial tokens like the rest of
 * Songs: this page was the last one on stock grays, a blue link and green /
 * red buttons, with "Requested by" and the date hard-coded in English.
 */
export default async function SongRequestsPage() {
  const { user, isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!user) {
    redirect('/sign-in?redirect=/dashboard/songs/requests');
  }
  if (!isAdmin && !isTeacher) {
    redirect('/dashboard/songs');
  }

  const [t, locale] = await Promise.all([getTranslations('Songs'), getLocale()]);
  const { requests, error } = await getSongRequests('pending');
  const dateLocale = locale.startsWith('en') ? 'en-US' : locale;
  // Polish quotes open low: „…”.
  const [quoteOpen, quoteClose] = locale.startsWith('pl') ? ['„', '”'] : ['“', '”'];

  return (
    <div className={`${themeFontClass} min-h-full bg-[var(--ivory)] text-[var(--ink)]`}>
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
        <header className="flex items-start gap-3">
          <Link
            href="/dashboard/songs"
            aria-label={t('backToSongs')}
            className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-[var(--rule)] bg-[var(--card)] text-[var(--ink-2)]"
          >
            <ArrowLeft className="size-3.5" />
          </Link>
          <div className="min-w-0">
            <p className="m-0 font-[family-name:var(--mono)] text-[11px] uppercase tracking-[.16em] text-[var(--ink-4)]">
              {t('requestsEyebrow')}
            </p>
            <h1 className="mt-1 mb-0 font-[family-name:var(--serif)] text-[28px] font-normal leading-tight tracking-[-0.02em]">
              {t('pendingRequestsTitle')}
            </h1>
          </div>
        </header>

        {error ? (
          <p
            role="alert"
            className="rounded-[10px] border border-[var(--rule)] bg-[var(--card)] p-4 text-sm text-[var(--danger)]"
          >
            {error}
          </p>
        ) : requests.length === 0 ? (
          <p className="rounded-[10px] border border-[var(--rule)] bg-[var(--card)] py-12 text-center font-[family-name:var(--serif)] italic text-[var(--ink-4)]">
            {t('noPendingRequests')}
          </p>
        ) : (
          <ul className="m-0 list-none space-y-3 p-0">
            {requests.map((req) => (
              <li
                key={req.id}
                className="flex flex-col gap-4 rounded-[10px] border border-[var(--rule)] bg-[var(--card)] p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-2">
                  <h2 className="m-0 font-[family-name:var(--serif)] text-xl font-normal italic">
                    {req.title}
                    {req.artist && (
                      <span className="ml-2 font-[family-name:var(--sans)] text-sm not-italic text-[var(--ink-3)]">
                        {req.artist}
                      </span>
                    )}
                  </h2>
                  <p className="m-0 font-[family-name:var(--mono)] text-[11px] text-[var(--ink-4)]">
                    {t('requestedBy', {
                      name: req.student?.full_name || t('unknownStudent'),
                      date: new Date(req.created_at).toLocaleDateString(dateLocale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }),
                    })}
                  </p>
                  {req.url && (
                    <a
                      href={req.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-w-md truncate text-sm text-[var(--gold-2)] underline-offset-2 hover:underline"
                    >
                      {req.url}
                    </a>
                  )}
                  {req.notes && (
                    <blockquote className="m-0 border-l-2 border-[var(--gold-dim)] pl-3 font-[family-name:var(--serif)] text-sm italic text-[var(--ink-2)]">
                      {quoteOpen}
                      {req.notes}
                      {quoteClose}
                    </blockquote>
                  )}
                </div>
                <div className="shrink-0">
                  <SongRequestActions requestId={req.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
