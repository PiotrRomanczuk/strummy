'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StudentCount, TeachingContext } from '@/schemas/TeacherLeadSchema';

export type LeadFieldValues = {
  fullName: string;
  email: string;
  phone: string;
  teachingContext?: TeachingContext;
  studentCount?: StudentCount;
  biggestPain: string;
  wantsContact: boolean;
  website: string;
};

type Props = {
  values: LeadFieldValues;
  disabled: boolean;
  onChange: <K extends keyof LeadFieldValues>(key: K, value: LeadFieldValues[K]) => void;
};

const CONTEXTS: TeachingContext[] = ['private', 'school', 'online', 'mixed'];
const COUNTS: StudentCount[] = ['1-5', '6-15', '16-30', '30+'];

/**
 * `h-12` on every text input is deliberate. shadcn's Input is `h-9` — 36px,
 * under the 44px iOS touch target — and this form is the conversion step of a
 * campaign whose traffic is almost entirely phones. The Select triggers carry
 * the same floor via `min-h-[44px]`.
 */
export const TeacherLeadFields = ({ values, disabled, onChange }: Props) => {
  const t = useTranslations('ForTeachers.form');

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="lead-name">{t('name')}</Label>
        <Input
          id="lead-name"
          data-testid="lead-name"
          className="h-12"
          value={values.fullName}
          disabled={disabled}
          required
          autoComplete="name"
          placeholder={t('namePlaceholder')}
          onChange={(e) => onChange('fullName', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-email">{t('email')}</Label>
        <Input
          id="lead-email"
          data-testid="lead-email"
          className="h-12"
          type="email"
          value={values.email}
          disabled={disabled}
          required
          autoComplete="email"
          placeholder={t('emailPlaceholder')}
          onChange={(e) => onChange('email', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-phone">
          {t('phone')} <span className="text-muted-foreground">({t('optional')})</span>
        </Label>
        <Input
          id="lead-phone"
          data-testid="lead-phone"
          className="h-12"
          type="tel"
          value={values.phone}
          disabled={disabled}
          autoComplete="tel"
          placeholder={t('phonePlaceholder')}
          onChange={(e) => onChange('phone', e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lead-context">{t('context.label')}</Label>
          <Select
            value={values.teachingContext}
            disabled={disabled}
            onValueChange={(v) => onChange('teachingContext', v as TeachingContext)}
          >
            <SelectTrigger id="lead-context" className="min-h-[44px]">
              <SelectValue placeholder={t('context.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {CONTEXTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`context.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="lead-students">{t('students.label')}</Label>
          <Select
            value={values.studentCount}
            disabled={disabled}
            onValueChange={(v) => onChange('studentCount', v as StudentCount)}
          >
            <SelectTrigger id="lead-students" className="min-h-[44px]">
              <SelectValue placeholder={t('students.placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {COUNTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`students.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-pain">{t('pain.label')}</Label>
        <Textarea
          id="lead-pain"
          data-testid="lead-pain"
          rows={4}
          value={values.biggestPain}
          disabled={disabled}
          placeholder={t('pain.placeholder')}
          onChange={(e) => onChange('biggestPain', e.target.value)}
        />
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="lead-consent"
          data-testid="lead-consent"
          checked={values.wantsContact}
          disabled={disabled}
          onCheckedChange={(checked) => onChange('wantsContact', checked === true)}
        />
        <Label htmlFor="lead-consent" className="text-sm leading-snug font-normal">
          {t('consent')}
        </Label>
      </div>

      {/* Honeypot — off-screen rather than display:none, which some bots skip. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-website">Website</label>
        <input
          id="lead-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => onChange('website', e.target.value)}
        />
      </div>
    </>
  );
};
