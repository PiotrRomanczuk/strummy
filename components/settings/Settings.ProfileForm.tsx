'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { updateProfileNameAction, type ProfileSettingsState } from '@/app/actions/profile-settings';
import { AvatarUpload } from './Settings.AvatarUpload';
import {
  Card,
  CardHeader,
  FieldLabel,
  readonlyInputStyle,
  editableInputStyle,
} from './Settings.Card';

const INITIAL: ProfileSettingsState = {};

type Props = {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  roleLabel: string;
};

export const ProfileForm = ({ userId, email, fullName, phone, avatarUrl, roleLabel }: Props) => {
  const t = useTranslations('Settings');
  const [state, formAction, pending] = useActionState(updateProfileNameAction, INITIAL);

  return (
    <Card>
      <CardHeader eyebrow={t('profileCardEyebrow')} title={t('profileCardTitle')} />
      <form
        action={formAction}
        style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <div>
          <FieldLabel label={t('fieldEmail')} />
          <input value={email} disabled style={readonlyInputStyle} />
        </div>
        <div>
          <FieldLabel label={t('fieldRole')} />
          <input value={roleLabel} disabled style={readonlyInputStyle} />
        </div>
        <div>
          <FieldLabel label={t('fieldDisplayName')} />
          <input
            name="full_name"
            defaultValue={fullName ?? ''}
            placeholder={t('fieldDisplayNamePlaceholder')}
            maxLength={120}
            required
            style={editableInputStyle}
          />
        </div>
        <div>
          <FieldLabel label={t('fieldPhone')} />
          <input
            name="phone"
            type="tel"
            defaultValue={phone ?? ''}
            placeholder={t('fieldPhonePlaceholder')}
            maxLength={50}
            style={editableInputStyle}
          />
        </div>
        <div>
          <FieldLabel label={t('fieldAvatar')} />
          <AvatarUpload userId={userId} initialUrl={avatarUrl} />
          {state.error && (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                color: 'var(--danger)',
                fontFamily: 'var(--mono)',
              }}
            >
              {state.error}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
          {state.saved && !state.error && (
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--success)',
                textTransform: 'uppercase',
                letterSpacing: '.12em',
              }}
            >
              ✓ {t('savedConfirmation')}
            </span>
          )}
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
            {pending ? t('saveButtonSaving') : t('saveButtonDefault')}
          </button>
        </div>
      </form>
    </Card>
  );
};
