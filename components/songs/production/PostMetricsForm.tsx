'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ContentPost } from '@/types/ContentPost';
import { useUpdatePostMetrics } from './hooks/useContentPosts';

interface Props {
  songId: string;
  post: ContentPost;
  onSaved?: () => void;
}

export default function PostMetricsForm({ songId, post, onSaved }: Props) {
  const t = useTranslations('Songs');
  const [views, setViews] = useState(post.views_count);
  const [likes, setLikes] = useState(post.likes_count);
  const [comments, setComments] = useState(post.comments_count);
  const [shares, setShares] = useState(post.shares_count);
  const [saves, setSaves] = useState(post.saves_count);
  const update = useUpdatePostMetrics(songId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      {
        id: post.id,
        input: {
          views_count: views,
          likes_count: likes,
          comments_count: comments,
          shares_count: shares,
          saves_count: saves,
        },
      },
      { onSuccess: () => onSaved?.() }
    );
  };

  const fields: {
    key: string;
    labelKey:
      | 'productionViewsLabel'
      | 'productionLikesLabel'
      | 'productionCommentsLabel'
      | 'productionSharesLabel'
      | 'productionSavesLabel';
    v: number;
    set: (n: number) => void;
  }[] = [
    { key: 'views', labelKey: 'productionViewsLabel', v: views, set: setViews },
    { key: 'likes', labelKey: 'productionLikesLabel', v: likes, set: setLikes },
    { key: 'comments', labelKey: 'productionCommentsLabel', v: comments, set: setComments },
    { key: 'shares', labelKey: 'productionSharesLabel', v: shares, set: setShares },
    { key: 'saves', labelKey: 'productionSavesLabel', v: saves, set: setSaves },
  ];

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label>{t(f.labelKey)}</Label>
            <Input
              type="number"
              min={0}
              value={f.v}
              onChange={(e) => f.set(Number(e.target.value || 0))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? t('formSavingButton') : t('productionSaveMetricsButton')}
        </Button>
      </div>
    </form>
  );
}
