'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTheoryCourse, updateTheoryCourse } from '@/app/dashboard/theory/actions';

interface TheoryCourseFormProps {
  mode: 'create' | 'edit';
  courseId?: string;
  defaultValues?: {
    title: string;
    description: string;
    cover_image_url: string;
    level: string;
    is_published: boolean;
  };
}

export function TheoryCourseForm({ mode, courseId, defaultValues }: TheoryCourseFormProps) {
  const router = useRouter();
  const t = useTranslations('Theory');
  const tSongs = useTranslations('Songs');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [description, setDescription] = useState(defaultValues?.description ?? '');
  const [coverUrl, setCoverUrl] = useState(defaultValues?.cover_image_url ?? '');
  const [level, setLevel] = useState(defaultValues?.level ?? 'beginner');
  const [isPublished, setIsPublished] = useState(defaultValues?.is_published ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const input = {
      title,
      description: description || undefined,
      cover_image_url: coverUrl || undefined,
      level,
      is_published: isPublished,
    };

    const result =
      mode === 'create'
        ? await createTheoryCourse(input)
        : await updateTheoryCourse(courseId!, input);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? t('courseFormError'));
      return;
    }

    if (mode === 'create' && 'courseId' in result) {
      router.push(`/dashboard/theory/${result.courseId}`);
    } else {
      router.push(`/dashboard/theory/${courseId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">{t('courseFormTitleLabel')}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('courseFormTitlePlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('courseFormDescriptionLabel')}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('courseFormDescriptionPlaceholder')}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_url">{t('courseFormCoverUrlLabel')}</Label>
        <Input
          id="cover_url"
          type="url"
          value={coverUrl}
          onChange={(e) => setCoverUrl(e.target.value)}
          placeholder={t('courseFormCoverUrlPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="level">{t('courseFormLevelLabel')}</Label>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger id="level">
            <SelectValue placeholder={t('courseFormLevelPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">{tSongs('levelBeginner')}</SelectItem>
            <SelectItem value="intermediate">{tSongs('levelIntermediate')}</SelectItem>
            <SelectItem value="advanced">{tSongs('levelAdvanced')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
        <Label htmlFor="published">{t('courseFormPublishLabel')}</Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t('courseFormSavingButton')
            : mode === 'create'
              ? t('courseFormCreateButton')
              : t('courseFormSaveButton')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('courseFormCancelButton')}
        </Button>
      </div>
    </form>
  );
}
