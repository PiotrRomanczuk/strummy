'use client';

import { useActionState, useRef, useState } from 'react';
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
  // Phone wizard step. Every required field lives in step I, so a rejected
  // submit always sends the user back there to see the errors.
  const [step, setStep] = useState(1);
  const [seenErrors, setSeenErrors] = useState(state.errors);
  if (state.errors !== seenErrors) {
    setSeenErrors(state.errors);
    if (state.errors) setStep(1);
  }

  return (
    <div style={formStyles.page} className="ui-song-wizard" data-step={step}>
      <SongWizardHeader
        step={step}
        onStep={setStep}
        formId={FORM_ID}
        isPending={pending}
        onDraft={() => setDraft(true)}
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

      <form id={FORM_ID} action={formAction} className="ui-grid-form">
        <input type="hidden" name="is_draft" ref={isDraftRef} defaultValue="false" />
        <div>
          <SongFormSections form={form} errors={state.errors} pending={pending} />
          {state.errors?._form && <div style={formStyles.error}>{state.errors._form}</div>}
        </div>
        <SongFormAside form={form} />
      </form>
      <SongWizardFooter
        step={step}
        onStep={setStep}
        formId={FORM_ID}
        isPending={pending}
        onCreate={() => setDraft(false)}
      />
    </div>
  );
};
