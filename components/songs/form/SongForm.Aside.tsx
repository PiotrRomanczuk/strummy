'use client';

import { useTranslations } from 'next-intl';

import { FormPreviewPanel } from '@/components/shared/FormPreviewPanel';
import { SongFormCompletionTracker } from './SongForm.CompletionTracker';
import { SongFormPreview } from './SongForm.Preview';
import type { SongFormState } from './useSongFormState';

/** Right rail: live preview + completion card. */
export const SongFormAside = ({ form }: { form: SongFormState }) => {
  const t = useTranslations('Songs');
  const { values: v, counts } = form;
  return (
    <div className="ui-song-aside" style={{ position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
      <FormPreviewPanel>
        <SongFormPreview
          title={v.title}
          author={v.author}
          level={v.level}
          keyName={v.key}
          capoFret={v.capoFret}
          tempo={v.tempo}
          chords={v.chords}
          coverImageUrl={v.coverImageUrl}
        />
      </FormPreviewPanel>
      <SongFormCompletionTracker
        sections={[
          { label: t('formCompletionEssentials'), populated: counts.essentials, total: 4 },
          { label: t('formCompletionResources'), populated: counts.resources, total: 4 },
          { label: t('formCompletionMusical'), populated: counts.musical, total: 6 },
          { label: t('formCompletionContent'), populated: counts.content, total: 3 },
        ]}
      />
    </div>
  );
};
