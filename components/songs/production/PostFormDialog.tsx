'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ContentPlatform, ContentPost, ContentPostStatus } from '@/types/ContentPost';
import HashtagSetPicker from './HashtagSetPicker';
import { useCreateContentPost, useUpdateContentPost } from './hooks/useContentPosts';

interface Props {
  songId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: ContentPost | null;
}

const PLATFORMS: { v: ContentPlatform; l: string }[] = [
  { v: 'tiktok', l: 'TikTok' },
  { v: 'instagram', l: 'Instagram' },
  { v: 'youtube_shorts', l: 'YouTube Shorts' },
];

const STATUSES: {
  v: ContentPostStatus;
  labelKey:
    | 'productionStatusPlanned'
    | 'productionStatusScheduled'
    | 'productionStatusPublished'
    | 'productionStatusArchived';
}[] = [
  { v: 'planned', labelKey: 'productionStatusPlanned' },
  { v: 'scheduled', labelKey: 'productionStatusScheduled' },
  { v: 'published', labelKey: 'productionStatusPublished' },
  { v: 'archived', labelKey: 'productionStatusArchived' },
];

export default function PostFormDialog({ songId, open, onOpenChange, post }: Props) {
  const t = useTranslations('Songs');
  const [platform, setPlatform] = useState<ContentPlatform>(post?.platform ?? 'tiktok');
  const [status, setStatus] = useState<ContentPostStatus>(post?.status ?? 'planned');
  const [scheduledAt, setScheduledAt] = useState(post?.scheduled_at?.slice(0, 16) ?? '');
  const [hook, setHook] = useState(post?.hook ?? '');
  const [caption, setCaption] = useState(post?.caption ?? '');
  const [extra, setExtra] = useState((post?.extra_hashtags ?? []).join(' '));
  const [setIds, setSetIds] = useState<string[]>(post?.hashtag_set_ids ?? []);
  const [externalUrl, setExternalUrl] = useState(post?.external_url ?? '');

  const create = useCreateContentPost(songId);
  const update = useUpdateContentPost(songId);
  const isEdit = !!post;
  const pending = create.isPending || update.isPending;

  // A post with no date and no content is meaningless — the form used to accept
  // a completely empty submission and create a blank row.
  const hasContent = Boolean(hook.trim() || caption.trim() || externalUrl.trim());
  const validationError = !scheduledAt
    ? t('productionValidationMissingDate')
    : !hasContent
      ? t('productionValidationMissingContent')
      : null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validationError) return;
    const extraTokens = extra
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      platform,
      status,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      hook: hook || undefined,
      caption: caption || undefined,
      hashtag_set_ids: setIds,
      extra_hashtags: extraTokens,
      external_url: externalUrl || undefined,
    };
    if (isEdit && post) {
      update.mutate({ id: post.id, input: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate({ song_id: songId, ...payload }, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEdit ? t('productionEditPostTitle') : t('productionSchedulePostButton')}
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-1 pb-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t('productionPlatformLabel')}</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as ContentPlatform)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('productionSelectPlatformPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.v} value={p.v}>
                      {p.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('productionStatusLabel')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ContentPostStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('productionSelectStatusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.v} value={s.v}>
                      {t(s.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>{t('productionScheduledAtLabel')}</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>{t('productionHookLabel')}</Label>
            <Input value={hook} onChange={(e) => setHook(e.target.value)} maxLength={280} />
          </div>

          <div className="space-y-1">
            <Label>{t('productionCaptionLabel')}</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={2200}
            />
          </div>

          <div className="space-y-1">
            <Label>{t('productionHashtagSetsLabel')}</Label>
            <HashtagSetPicker selectedIds={setIds} onChange={setSetIds} />
          </div>

          <div className="space-y-1">
            <Label>{t('productionExtraHashtagsLabel')}</Label>
            <Input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder={t('productionExtraHashtagsPlaceholder')}
            />
          </div>

          <div className="space-y-1">
            <Label>{t('productionExternalUrlLabel')}</Label>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder={t('productionExternalUrlPlaceholder')}
            />
          </div>

          {validationError && (
            <p className="text-sm text-destructive" data-testid="post-form-error">
              {validationError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('productionCancelButton')}
            </Button>
            <Button type="submit" disabled={pending || Boolean(validationError)}>
              {pending
                ? t('formSavingButton')
                : isEdit
                  ? t('productionSaveButton')
                  : t('productionScheduleButton')}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
