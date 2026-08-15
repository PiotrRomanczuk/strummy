'use client';

import { useTranslations } from 'next-intl';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CourseFormData {
  title: string;
  description: string;
  cover_image_url: string;
  level: string;
  is_published: boolean;
}

interface StepProps {
  formData: CourseFormData;
  onChange: (data: CourseFormData) => void;
  errors: Record<string, string | undefined>;
}

export function StepBasicInfo({ formData, onChange, errors }: StepProps) {
  const t = useTranslations('Theory');

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="course-title" className="text-xs font-medium text-muted-foreground">
          {t('courseFormCourseTitleLabel')}
        </Label>
        <Input
          id="course-title"
          value={formData.title}
          onChange={(e) => onChange({ ...formData, title: e.target.value })}
          placeholder={t('courseFormTitlePlaceholder')}
          className={cn('min-h-[44px] text-base', errors.title && 'border-destructive')}
          required
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="course-description" className="text-xs font-medium text-muted-foreground">
          {t('courseFormDescriptionLabel')}
        </Label>
        <Textarea
          id="course-description"
          value={formData.description}
          onChange={(e) => onChange({ ...formData, description: e.target.value })}
          placeholder={t('courseFormDescriptionPlaceholder')}
          rows={4}
          className="text-base resize-none"
        />
      </div>
    </div>
  );
}

export function StepDetails({ formData, onChange }: StepProps) {
  const t = useTranslations('Theory');

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="course-level" className="text-xs font-medium text-muted-foreground">
          {t('courseFormDifficultyLevelLabel')}
        </Label>
        <Select
          value={formData.level}
          onValueChange={(value) => onChange({ ...formData, level: value })}
        >
          <SelectTrigger id="course-level" className="min-h-[44px] text-base">
            <SelectValue placeholder={t('courseFormLevelPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">{t('levelBeginner')}</SelectItem>
            <SelectItem value="intermediate">{t('levelIntermediate')}</SelectItem>
            <SelectItem value="advanced">{t('levelAdvanced')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="course-cover" className="text-xs font-medium text-muted-foreground">
          {t('courseFormCoverUrlOptionalLabel')}
        </Label>
        <Input
          id="course-cover"
          type="url"
          value={formData.cover_image_url}
          onChange={(e) => onChange({ ...formData, cover_image_url: e.target.value })}
          placeholder={t('courseFormCoverUrlPlaceholder')}
          className="min-h-[44px] text-base"
        />
      </div>

      <div className="flex items-center justify-between gap-4 p-4 bg-card rounded-xl border border-border">
        <div>
          <p className="text-sm font-medium">{t('courseFormPublishLabel')}</p>
          <p className="text-xs text-muted-foreground">{t('courseFormPublishHint')}</p>
        </div>
        <Switch
          checked={formData.is_published}
          onCheckedChange={(checked) => onChange({ ...formData, is_published: checked })}
        />
      </div>
    </div>
  );
}
