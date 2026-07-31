'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FormSection } from '@/components/shared/FormSection';
import { inputStyle } from './student-fields.shared';
import type { StudentStatus } from './user-edit-form.types';

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 10,
  color: 'var(--ink-4)',
  textTransform: 'uppercase',
  letterSpacing: '.12em',
  marginBottom: 6,
};

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span style={{ fontSize: 14 }}>{label}</span>
  </label>
);

type Props = {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isActive: boolean;
  studentStatus: StudentStatus;
  onIsAdmin: (v: boolean) => void;
  onIsTeacher: (v: boolean) => void;
  onIsStudent: (v: boolean) => void;
  onIsActive: (v: boolean) => void;
  onStudentStatus: (v: StudentStatus) => void;
};

/** Roles / status / account-active controls for the user edit form. */
export const UserEditFormAccount = ({
  isAdmin,
  isTeacher,
  isStudent,
  isActive,
  studentStatus,
  onIsAdmin,
  onIsTeacher,
  onIsStudent,
  onIsActive,
  onStudentStatus,
}: Props) => {
  const t = useTranslations('Users');
  const tRoles = useTranslations('Roles');
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  return (
    <FormSection numeral={t('accountNumeral')} title={t('accountSectionTitle')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={labelStyle}>{t('accountRolesLabel')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Toggle label={tRoles('admin')} checked={isAdmin} onChange={onIsAdmin} />
            <Toggle label={tRoles('teacher')} checked={isTeacher} onChange={onIsTeacher} />
            <Toggle label={tRoles('student')} checked={isStudent} onChange={onIsStudent} />
          </div>
        </div>

        {isStudent && (
          <div>
            <div style={labelStyle}>{t('accountStudentStatusLabel')}</div>
            <select
              value={studentStatus}
              onChange={(e) => onStudentStatus(e.target.value as StudentStatus)}
              style={inputStyle}
            >
              <option value="active">{t('filterActiveOption')}</option>
              <option value="archived">{t('filterArchivedOption')}</option>
            </select>
          </div>
        )}

        <div>
          <div style={labelStyle}>{t('accountLabel')}</div>
          <Toggle
            label={t('accountActiveToggleLabel')}
            checked={isActive}
            onChange={(v) => {
              if (!v && isActive) {
                setShowDeactivateDialog(true);
              } else {
                onIsActive(v);
              }
            }}
          />
        </div>
      </div>

      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accountDeactivateDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('accountDeactivateDialogDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onIsActive(false);
                setShowDeactivateDialog(false);
              }}
            >
              {t('accountDeactivateConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FormSection>
  );
};
