'use client';

import { ProfileForm } from './Settings.ProfileForm';
import { SettingsDangerZone } from './Settings.DangerZone';

type Props = {
  userId: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  roleLabel: string;
  deletionScheduledFor: string | null;
};

/** Settings · Profile tab: the profile form and the danger zone. */
export const Settings = ({
  userId,
  email,
  fullName,
  phone,
  avatarUrl,
  roleLabel,
  deletionScheduledFor,
}: Props) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
      <ProfileForm
        userId={userId}
        email={email}
        fullName={fullName}
        phone={phone}
        avatarUrl={avatarUrl}
        roleLabel={roleLabel}
      />
      <SettingsDangerZone deletionScheduledFor={deletionScheduledFor} />
    </div>
  );
};
