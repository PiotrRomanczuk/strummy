'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createTheoryLesson, updateTheoryLesson } from '@/app/dashboard/theory/actions';

interface TheoryLessonFormProps {
  courseId: string;
  mode: 'create' | 'edit';
  lessonId?: string;
  defaultValues?: {
    title: string;
    content: string;
    excerpt: string;
    is_published: boolean;
  };
}

export function TheoryLessonForm({
  courseId,
  mode,
  lessonId,
  defaultValues,
}: TheoryLessonFormProps) {
  const router = useRouter();
  const t = useTranslations('Theory');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [content, setContent] = useState(defaultValues?.content ?? '');
  const [excerpt, setExcerpt] = useState(defaultValues?.excerpt ?? '');
  const [isPublished, setIsPublished] = useState(defaultValues?.is_published ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const input = {
      title,
      content,
      excerpt: excerpt || undefined,
      is_published: isPublished,
    };

    const result =
      mode === 'create'
        ? await createTheoryLesson(courseId, input)
        : await updateTheoryLesson(lessonId!, courseId, input);

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? t('lessonFormError'));
      return;
    }

    if (mode === 'create' && 'lessonId' in result) {
      router.push(`/dashboard/theory/${courseId}/${result.lessonId}`);
    } else {
      router.push(`/dashboard/theory/${courseId}/${lessonId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">{t('lessonFormTitleLabel')}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('lessonFormTitlePlaceholder')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">{t('lessonFormExcerptLabel')}</Label>
        <Input
          id="excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder={t('lessonFormExcerptPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">{t('lessonFormContentLabel')}</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('lessonFormContentPlaceholder')}
          rows={20}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
        <Label htmlFor="published">{t('lessonFormPublishLabel')}</Label>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? t('lessonFormSavingButton')
            : mode === 'create'
              ? t('lessonFormCreateButton')
              : t('lessonFormSaveButton')}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t('lessonFormCancelButton')}
        </Button>
      </div>
    </form>
  );
}
