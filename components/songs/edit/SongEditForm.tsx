'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { formStyles } from '@/components/shared/form.styles';
import { FormPageHeader, FormTitleAccent } from '@/components/shared/FormPageHeader';
import { updateSongAction, type SongEditState } from '@/app/actions/song-edit';
import type { SongLevel } from '@/components/shared/level-label.helpers';
import { parseChordsString } from '../form/SongForm.Fields.Chords';
import { SongFormAside } from '../form/SongForm.Aside';
import { SongFormSections } from '../form/SongForm.Sections';
import { SongFormSpotifyAccelerator } from '../form/SongForm.SpotifyAccelerator';
import { useSongFormState } from '../form/useSongFormState';

const INITIAL: SongEditState = {};
const FORM_ID = 'song-edit-form';

type Song = {
  id: string;
  title: string | null;
  author: string | null;
  level: string | null;
  key: string | null;
  capo_fret: number | null;
  tempo: number | null;
  time_signature: number | null;
  release_year: number | null;
  chords: string | null;
  strumming_pattern: string | null;
  category: string | null;
  youtube_url: string | null;
  spotify_link_url: string | null;
  ultimate_guitar_link: string | null;
  tiktok_short_url: string | null;
  cover_image_url: string | null;
  lyrics_with_chords: string | null;
  notes?: string | null;
};

/** Edit form — the create form's Claude Design sections, prefilled with the song. */
export const SongEditForm = ({ song }: { song: Song }) => {
  const t = useTranslations('Songs');
  const [state, formAction, pending] = useActionState(updateSongAction, INITIAL);
  const form = useSongFormState({
    title: song.title ?? '',
    author: song.author ?? '',
    level: (song.level ?? 'beginner') as SongLevel,
    key: song.key ?? 'C',
    capoFret: song.capo_fret,
    tempo: song.tempo,
    timeSignature: song.time_signature,
    releaseYear: song.release_year,
    chords: parseChordsString(song.chords ?? ''),
    strumming: song.strumming_pattern ?? '',
    notes: song.notes ?? '',
    lyrics: song.lyrics_with_chords ?? '',
    category: song.category ?? '',
    youtubeUrl: song.youtube_url ?? '',
    spotifyLinkUrl: song.spotify_link_url ?? '',
    ultimateGuitarLink: song.ultimate_guitar_link ?? '',
    tiktokShortUrl: song.tiktok_short_url ?? '',
    coverImageUrl: song.cover_image_url,
  });

  return (
    <div style={formStyles.page}>
      <FormPageHeader
        crumbLabel={song.title ?? t('formCrumb')}
        crumbHref={`/dashboard/songs/${song.id}`}
        current={t('editFormCrumb')}
        title={
          <>
            {t('editFormTitleLead')} <FormTitleAccent>{t('formTitleNoun')}</FormTitleAccent>.
          </>
        }
        sub={t('editFormSubtitle')}
        cancelHref={`/dashboard/songs/${song.id}`}
        cancelLabel={t('formCancelButton')}
        submitLabel={pending ? t('formSavingButton') : t('editFormSaveButton')}
        formId={FORM_ID}
        isSaving={pending}
      />

      <SongFormSpotifyAccelerator onAutoFill={form.applySpotify} />

      <form id={FORM_ID} action={formAction} className="ui-grid-form">
        <input type="hidden" name="id" value={song.id} />
        <div>
          <SongFormSections
            form={form}
            errors={state.errors}
            pending={pending}
            songId={song.id}
            checkDuplicates={false}
          />
          {state.errors?._form && <div style={formStyles.error}>{state.errors._form}</div>}
        </div>
        <SongFormAside form={form} />
      </form>
    </div>
  );
};
