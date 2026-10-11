'use client';

import { useTranslations } from 'next-intl';

import { FormSection } from '@/components/shared/FormSection';
import { Field } from './Field';
import { SongFormCoverUpload } from './SongForm.CoverUpload';
import { SongFormDuplicateWarning } from './SongForm.DuplicateWarning';
import { SongFormFieldsChords } from './SongForm.Fields.Chords';
import { SongFormFieldsDetails } from './SongForm.Fields.Details';
import { SongFormFieldsExternal } from './SongForm.Fields.External';
import { SongFormFieldsIdentity } from './SongForm.Fields.Identity';
import { SongFormFieldsLyrics } from './SongForm.Fields.Lyrics';
import { SongFormFieldsNotes } from './SongForm.Fields.Notes';
import { SongFormFieldsStrumming } from './SongForm.Fields.Strumming';
import { SongFormUltimateGuitarImport } from './SongForm.UltimateGuitarImport';
import type { SongFormState } from './useSongFormState';

type Errors = Partial<Record<string, string | undefined>>;

type Props = {
  form: SongFormState;
  errors?: Errors;
  pending: boolean;
  /** Edit flow: lets the cover upload overwrite this song's object. */
  songId?: string;
  /** The duplicate check only makes sense when adding a song. */
  checkDuplicates?: boolean;
};

/** The four Claude Design sections of the song form, shared by create and edit. */
export const SongFormSections = ({
  form,
  errors = {},
  pending,
  songId,
  checkDuplicates = true,
}: Props) => {
  const t = useTranslations('Songs');
  const { values: v, set, counts } = form;

  return (
    <>
      <input type="hidden" name="cover_image_url" value={v.coverImageUrl ?? ''} />
      <input type="hidden" name="chords" value={v.chords.join(', ')} />
      <input type="hidden" name="strumming_pattern" value={v.strumming} />

      <div className="ui-wizard-step" data-wizard-step="1">
        <FormSection
          numeral={t('formNumeralEssentials')}
          title={t('formSectionEssentialsTitle')}
          count={4}
          populated={counts.essentials}
        >
          <SongFormFieldsIdentity
            title={v.title}
            author={v.author}
            level={v.level}
            keyName={v.key}
            category={v.category}
            titleError={errors.title}
            authorError={errors.author}
            levelError={errors.level}
            keyError={errors.key}
            warning={
              checkDuplicates ? (
                <SongFormDuplicateWarning title={v.title} author={v.author} />
              ) : null
            }
            onTitle={set.setTitle}
            onAuthor={set.setAuthor}
            onLevel={set.setLevel}
            onKey={set.setKey}
            onCategory={set.setCategory}
          />
        </FormSection>
      </div>

      <div className="ui-wizard-step" data-wizard-step="2">
        <FormSection
          numeral={t('formNumeralResources')}
          title={t('formSectionResourcesTitle')}
          count={4}
          populated={counts.resources}
        >
          <SongFormFieldsExternal
            youtubeUrl={v.youtubeUrl}
            spotifyLinkUrl={v.spotifyLinkUrl}
            ultimateGuitarLink={v.ultimateGuitarLink}
            tiktokShortUrl={v.tiktokShortUrl}
            onYoutubeUrl={set.setYoutubeUrl}
            onSpotifyLinkUrl={set.setSpotifyLinkUrl}
            onUltimateGuitarLink={set.setUltimateGuitarLink}
            onTiktokShortUrl={set.setTiktokShortUrl}
          />
        </FormSection>
      </div>

      <div className="ui-wizard-step" data-wizard-step="3">
        <FormSection
          numeral={t('formNumeralMusical')}
          title={t('formSectionMusicalTitle')}
          count={6}
          populated={counts.musical}
        >
          <SongFormFieldsDetails
            capoFret={v.capoFret}
            tempo={v.tempo}
            timeSignature={v.timeSignature}
            releaseYear={v.releaseYear}
            onCapoFret={set.setCapoFret}
            onTempo={set.setTempo}
            onTimeSignature={set.setTimeSignature}
            onReleaseYear={set.setReleaseYear}
          />
          <div className="ui-form-row-2" style={{ gap: 16 }}>
            <Field label={t('formStrummingLabel')} hint={t('formStrummingHint')}>
              <SongFormFieldsStrumming value={v.strumming} onChange={set.setStrumming} />
            </Field>
            <Field label={t('formChordsLabel')} hint={t('formChordsHint')}>
              <SongFormFieldsChords chords={v.chords} onChange={set.setChords} />
            </Field>
          </div>
        </FormSection>
      </div>

      <div className="ui-wizard-step" data-wizard-step="4">
        <FormSection
          numeral={t('formNumeralContent')}
          title={t('formSectionContentTitle')}
          count={3}
          populated={counts.content}
        >
          <SongFormUltimateGuitarImport onApply={form.applyUltimateGuitar} />
          <div style={{ marginBottom: 16 }}>
            <SongFormFieldsLyrics
              value={v.lyrics}
              onChange={set.setLyrics}
              error={errors.lyrics_with_chords}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <SongFormFieldsNotes
              notes={v.notes}
              notesError={errors.notes}
              pending={pending}
              songData={{
                title: v.title,
                author: v.author,
                level: v.level,
                key: v.key,
                chords: v.chords.join(', '),
                tempo: v.tempo,
                capo_fret: v.capoFret,
                strumming_pattern: v.strumming,
              }}
              onNotes={set.setNotes}
            />
          </div>
          <Field label={t('formLabelImages')}>
            <SongFormCoverUpload
              value={v.coverImageUrl}
              onChange={set.setCoverImageUrl}
              songId={songId}
            />
          </Field>
        </FormSection>
      </div>
    </>
  );
};
