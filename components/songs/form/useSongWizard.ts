'use client';

import { useRef, useState, type MouseEvent } from 'react';

import { firstInvalidWizardStep } from './song-form.helpers';
import { WIZARD_STEPS } from './SongForm.Wizard';

/**
 * Phone wizard state for the song form. Every step but the current one is
 * display:none, and the browser silently refuses to submit a form whose invalid
 * control it cannot focus — so Next and the submit buttons move to the step
 * holding the first invalid field before letting the browser report it.
 */
export function useSongWizard(errors: unknown, setDraft: (isDraft: boolean) => void) {
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);

  // Every required field lives in step I, so a rejected server-side submit
  // always sends the user back there to see the errors.
  const [seenErrors, setSeenErrors] = useState(errors);
  if (errors !== seenErrors) {
    setSeenErrors(errors);
    if (errors) setStep(1);
  }

  const blockOnInvalid = (maxStep: number): boolean => {
    const invalid = firstInvalidWizardStep(formRef.current, maxStep);
    if (invalid === null) return false;
    setStep(invalid);
    requestAnimationFrame(() => formRef.current?.reportValidity());
    return true;
  };

  const submitFromWizard = (isDraft: boolean) => (event: MouseEvent) => {
    setDraft(isDraft);
    if (blockOnInvalid(WIZARD_STEPS)) event.preventDefault();
  };

  return {
    step,
    formRef,
    /** The stepper jumps freely. */
    jumpTo: setStep,
    /** Next validates the step being left. */
    nextStep: (next: number) => {
      if (next > step && blockOnInvalid(step)) return;
      setStep(next);
    },
    onDraft: submitFromWizard(true),
    onCreate: submitFromWizard(false),
  };
}
