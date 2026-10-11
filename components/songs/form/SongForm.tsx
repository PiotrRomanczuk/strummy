'use client';

import { useActionState, useRef } from 'react';
import { useTranslations } from 'next-intl';

import { formStyles } from '@/components/shared/form.styles';
import {
  FormPageHeader,
  FormTitleAccent,
  formSecondaryButton,
} from '@/components/shared/FormPageHeader';
import { createSongAction, type SongFormState as ActionState } from '@/app/actions/song-form';

import { SongFormAside } from './SongForm.Aside';
import { SongFormSections } from './SongForm.Sections';
import { SongFormSpotifyAccelerator } from './SongForm.SpotifyAccelerator';
import { SongWizardFooter, SongWizardHeader } from './SongForm.Wizard';
import { useSongWizard } from './useSongWizard';
import { useSongFormState } from './useSongFormState';

const INITIAL_STATE: ActionState = {};
const FORM_ID = 'song-form';

/** Claude Design Song Form A — "Add a *song*." */
export const SongForm = () => {
  const t = useTranslations('Songs');
  const [state, formAction, pending] = useActionState(createSongAction, INITIAL_STATE);
  const form = useSongFormState();
  const isDraftRef = useRef<HTMLInputElement>(null);
  const setDraft = (isDraft: boolean) => {
    if (isDraftRef.current) isDraftRef.current.value = String(isDraft);
  };
  const { step, formRef, jumpTo, nextStep, onDraft, onCreate } = useSongWizard(
    state.errors,
    setDraft
  );

  return (
    <div style={formStyles.page} className="ui-song-wizard" data-step={step}>
      <SongWizardHeader
        step={step}
        onStep={jumpTo}
        formId={FORM_ID}
        isPending={pending}
        onDraft={onDraft}
      />
      <div className="hidden md:block">
        <FormPageHeader
          crumbLabel={t('formCrumb')}
          crumbHref="/dashboard/songs"
          current={t('formCrumbNew')}
          title={
            <>
              {t('formTitleLead')} <FormTitleAccent>{t('formTitleNoun')}</FormTitleAccent>.
            </>
          }
          sub={t('formAddSongSubtitle')}
          cancelHref="/dashboard/songs"
          cancelLabel={t('formCancelButton')}
          submitLabel={pending ? t('formSavingButton') : t('formCreateSongButton')}
          formId={FORM_ID}
          isSaving={pending}
          onSubmitClick={() => setDraft(false)}
          submitTestId="song-save"
          extraActions={
            <button
              type="submit"
              form={FORM_ID}
              disabled={pending}
              onClick={() => setDraft(true)}
              style={{ ...formSecondaryButton, fontWeight: 500 }}
            >
              {t('formSaveDraftButton')}
            </button>
          }
        />
      </div>

      <div className="ui-wizard-step" data-wizard-step="1">
        <SongFormSpotifyAccelerator onAutoFill={form.applySpotify} />
      </div>

      <form id={FORM_ID} ref={formRef} action={formAction} className="ui-grid-form">
        <input type="hidden" name="is_draft" ref={isDraftRef} defaultValue="false" />
        <div>
          <SongFormSections form={form} errors={state.errors} pending={pending} />
          {state.errors?._form && <div style={formStyles.error}>{state.errors._form}</div>}
        </div>
        <SongFormAside form={form} />
      </form>
      <SongWizardFooter
        step={step}
        onStep={nextStep}
        formId={FORM_ID}
        isPending={pending}
        onCreate={onCreate}
      />
    </div>
  );
};
