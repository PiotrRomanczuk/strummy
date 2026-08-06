'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';

import { FormSection } from '@/components/shared/FormSection';
import { FormPreviewPanel } from '@/components/shared/FormPreviewPanel';
import { updateSongAction, type SongEditState } from '@/app/actions/song-edit';
import { SongFormPreview } from '../form/SongForm.Preview';
import { SongFormCompletionTracker } from '../form/SongForm.CompletionTracker';
import { SongFormFieldsChords, parseChordsString } from '../form/SongForm.Fields.Chords';
import { SongFormFieldsStrumming } from '../form/SongForm.Fields.Strumming';
import { SongFormCoverUpload } from '../form/SongForm.CoverUpload';
import { SongFormFieldsExternal } from '../form/SongForm.Fields.External';
import { SongEditFormFieldsIdentity } from './SongEditForm.Fields.Identity';
import { SongEditFormFieldsDetails } from './SongEditForm.Fields.Details';
import { SongEditFormFieldsLyrics } from './SongEditForm.Fields.Lyrics';
import {
  SongFormSpotifyAccelerator,
  type SpotifyAutoFill,
} from '../form/SongForm.SpotifyAccelerator';
import { SongFormUltimateGuitarImport } from '../form/SongForm.UltimateGuitarImport';
import type { UltimateGuitarDraft } from '../form/ultimate-guitar.types';

const INITIAL: SongEditState = {};

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
};

// eslint-disable-next-line max-lines-per-function -- single-page form wiring 8 sub-sections
export const SongEditForm = ({ song }: { song: Song }) => {
  const t = useTranslations('Songs');
  const [state, formAction, pending] = useActionState(updateSongAction, INITIAL);
  const [title, setTitle] = useState(song.title ?? '');
  const [author, setAuthor] = useState(song.author ?? '');
  const [level, setLevel] = useState(song.level ?? 'beginner');
  const [key, setKey] = useState(song.key ?? 'C');
  const [capoFret, setCapoFret] = useState(song.capo_fret);
  const [tempo, setTempo] = useState(song.tempo);
  const [timeSignature, setTimeSignature] = useState(song.time_signature);
  const [releaseYear, setReleaseYear] = useState(song.release_year);
  const [chords, setChords] = useState(parseChordsString(song.chords ?? ''));
  const [lyrics, setLyrics] = useState(song.lyrics_with_chords ?? '');
  const [strumming, setStrumming] = useState(song.strumming_pattern ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(song.cover_image_url);
  const [category, setCategory] = useState(song.category ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(song.youtube_url ?? '');
  const [spotifyLinkUrl, setSpotifyLinkUrl] = useState(song.spotify_link_url ?? '');
  const [ultimateGuitarLink, setUltimateGuitarLink] = useState(song.ultimate_guitar_link ?? '');
  const [tiktokShortUrl, setTiktokShortUrl] = useState(song.tiktok_short_url ?? '');

  const applySpotifyAutoFill = (fill: SpotifyAutoFill) => {
    if (fill.title) setTitle(fill.title);
    if (fill.author) setAuthor(fill.author);
    if (fill.spotifyLinkUrl) setSpotifyLinkUrl(fill.spotifyLinkUrl);
    if (fill.coverImageUrl) setCoverImageUrl(fill.coverImageUrl);
    if (fill.releaseYear) setReleaseYear(fill.releaseYear);
    if (fill.key) setKey(fill.key);
    if (fill.tempo) setTempo(fill.tempo);
    if (fill.timeSignature) setTimeSignature(fill.timeSignature);
  };

  const applyUltimateGuitar = (draft: UltimateGuitarDraft) => {
    if (draft.title) setTitle(draft.title);
    if (draft.author) setAuthor(draft.author);
    if (draft.level) setLevel(draft.level);
    if (draft.capoFret !== undefined) setCapoFret(draft.capoFret);
    if (draft.chords.length > 0) setChords(draft.chords);
    if (draft.lyricsWithChords) setLyrics(draft.lyricsWithChords);
    if (draft.ultimateGuitarLink) setUltimateGuitarLink(draft.ultimateGuitarLink);
  };

  const essentialsPopulated = [title, author].filter(Boolean).length;
  const musicalPopulated = [capoFret, tempo, timeSignature, releaseYear].filter(
    (v) => v !== null
  ).length;
  const resourcesPopulated = [
    youtubeUrl,
    spotifyLinkUrl,
    ultimateGuitarLink,
    tiktokShortUrl,
  ].filter(Boolean).length;

  return (
    <div
      style={{
        background: 'var(--ivory)',
        color: 'var(--ink)',
        minHeight: '100%',
        padding: '28px 32px 64px',
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <Link
          href={`/dashboard/songs/${song.id}`}
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--ink-4)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '.14em',
          }}
        >
          {t('editFormBackLink')}
        </Link>
        <h1
          style={{
            margin: '8px 0 6px',
            fontFamily: 'var(--serif)',
            fontWeight: 400,
            fontSize: 40,
            letterSpacing: '-0.02em',
            fontStyle: 'italic',
          }}
        >
          {t('editFormTitle', { title: song.title ?? t('editFormSongFallback') })}
        </h1>
        <p style={{ margin: '0 0 22px', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          {t('editFormSubtitle')}
        </p>

        <SongFormSpotifyAccelerator onAutoFill={applySpotifyAutoFill} />
        <SongFormUltimateGuitarImport onApply={applyUltimateGuitar} />

        <form action={formAction}>
          <input type="hidden" name="id" value={song.id} />
          <input type="hidden" name="chords" value={chords.join(', ')} />
          <input type="hidden" name="strumming_pattern" value={strumming} />
          <input type="hidden" name="cover_image_url" value={coverImageUrl ?? ''} />
          <div className="ui-grid-form">
            <div>
              <FormSection
                numeral={t('formNumeralEssentials')}
                title={t('formSectionEssentialsTitle')}
                count={2}
                populated={essentialsPopulated}
              >
                <SongEditFormFieldsIdentity
                  title={title}
                  author={author}
                  titleError={state.errors?.title}
                  authorError={state.errors?.author}
                  onTitle={setTitle}
                  onAuthor={setAuthor}
                />
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      color: 'var(--ink-4)',
                      textTransform: 'uppercase',
                      letterSpacing: '.12em',
                      marginBottom: 6,
                    }}
                  >
                    {t('formCoverImageLabel')}{' '}
                    <span style={{ color: 'var(--ink-5)' }}>{t('formOptionalLabel')}</span>
                  </div>
                  <SongFormCoverUpload
                    value={coverImageUrl}
                    onChange={setCoverImageUrl}
                    songId={song.id}
                  />
                </div>
              </FormSection>

              <FormSection
                numeral={t('formNumeralMusical')}
                title={t('formSectionMusicalTitle')}
                count={4}
                populated={musicalPopulated}
              >
                <SongEditFormFieldsDetails
                  level={level}
                  keyName={key}
                  capoFret={capoFret}
                  tempo={tempo}
                  timeSignature={timeSignature}
                  releaseYear={releaseYear}
                  onLevel={setLevel}
                  onKey={setKey}
                  onCapoFret={setCapoFret}
                  onTempo={setTempo}
                  onTimeSignature={setTimeSignature}
                  onReleaseYear={setReleaseYear}
                />
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      color: 'var(--ink-4)',
                      textTransform: 'uppercase',
                      letterSpacing: '.12em',
                      marginBottom: 6,
                    }}
                  >
                    {t('formChordsLabel')}{' '}
                    <span style={{ color: 'var(--ink-5)' }}>{t('formOptionalLabel')}</span>
                  </div>
                  <SongFormFieldsChords chords={chords} onChange={setChords} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      color: 'var(--ink-4)',
                      textTransform: 'uppercase',
                      letterSpacing: '.12em',
                      marginBottom: 6,
                    }}
                  >
                    {t('formStrummingLabel')}{' '}
                    <span style={{ color: 'var(--ink-5)' }}>{t('formOptionalLabel')}</span>
                  </div>
                  <SongFormFieldsStrumming value={strumming} onChange={setStrumming} />
                </div>
              </FormSection>

              <FormSection
                numeral={t('formNumeralResources')}
                title={t('formSectionResourcesTitle')}
                count={4}
                populated={resourcesPopulated}
              >
                <SongFormFieldsExternal
                  category={category}
                  youtubeUrl={youtubeUrl}
                  spotifyLinkUrl={spotifyLinkUrl}
                  ultimateGuitarLink={ultimateGuitarLink}
                  tiktokShortUrl={tiktokShortUrl}
                  onCategory={setCategory}
                  onYoutubeUrl={setYoutubeUrl}
                  onSpotifyLinkUrl={setSpotifyLinkUrl}
                  onUltimateGuitarLink={setUltimateGuitarLink}
                  onTiktokShortUrl={setTiktokShortUrl}
                />
              </FormSection>

              <FormSection
                numeral={t('editFormNumeralLyrics')}
                title={t('editFormSectionLyricsTitle')}
                count={1}
                populated={lyrics ? 1 : 0}
              >
                <SongEditFormFieldsLyrics
                  lyrics={lyrics}
                  onChange={setLyrics}
                  error={state.errors?.lyrics_with_chords}
                />
              </FormSection>

              {state.errors?._form && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(184,74,58,.06)',
                    border: '1px solid rgba(184,74,58,.2)',
                    borderRadius: 6,
                    color: 'var(--danger)',
                    fontSize: 13,
                    marginBottom: 16,
                  }}
                >
                  {state.errors._form}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="submit"
                  disabled={pending}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: pending ? 'var(--ink-4)' : 'var(--ink)',
                    color: 'var(--paper)',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: pending ? 'wait' : 'pointer',
                    fontFamily: 'var(--sans)',
                  }}
                >
                  {pending ? t('formSavingButton') : t('editFormSaveButton')}
                </button>
              </div>
            </div>

            <div>
              <FormPreviewPanel>
                <SongFormPreview
                  title={title}
                  author={author}
                  level={level}
                  keyName={key}
                  capoFret={capoFret}
                  tempo={tempo}
                  chords={chords}
                  category={category}
                  coverImageUrl={song.cover_image_url}
                  hasYoutube={Boolean(youtubeUrl)}
                  hasSpotify={Boolean(spotifyLinkUrl)}
                />
              </FormPreviewPanel>
              <SongFormCompletionTracker
                sections={[
                  {
                    label: t('formCompletionEssentials'),
                    populated: essentialsPopulated,
                    total: 2,
                  },
                  { label: t('formCompletionMusical'), populated: musicalPopulated, total: 4 },
                  { label: t('formCompletionResources'), populated: resourcesPopulated, total: 4 },
                  {
                    label: t('editFormCompletionLyrics'),
                    populated: song.lyrics_with_chords ? 1 : 0,
                    total: 1,
                  },
                ]}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
