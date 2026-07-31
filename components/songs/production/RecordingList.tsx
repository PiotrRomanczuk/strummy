'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sliders, Video } from 'lucide-react';
import type { SongVideo, ProductionStatus } from '@/types/SongVideo';
import RecordingQualityForm from './RecordingQualityForm';

const STATUS_TONE: Record<ProductionStatus, string> = {
  idea: 'bg-muted text-muted-foreground',
  recording: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  edited: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
};

const STATUS_LABEL_KEYS: Record<
  ProductionStatus,
  | 'productionStatusIdea'
  | 'productionStatusRecording'
  | 'productionStatusEdited'
  | 'productionStatusReady'
> = {
  idea: 'productionStatusIdea',
  recording: 'productionStatusRecording',
  edited: 'productionStatusEdited',
  ready: 'productionStatusReady',
};

interface Props {
  songId: string;
}

async function fetchRecordings(songId: string): Promise<SongVideo[]> {
  const res = await fetch(`/api/song/${songId}/videos`);
  if (!res.ok) throw new Error('Failed to load recordings');
  return ((await res.json()).videos ?? []) as SongVideo[];
}

export default function RecordingList({ songId }: Props) {
  const t = useTranslations('Songs');
  const { data = [], isLoading } = useQuery({
    queryKey: ['song-videos', songId],
    queryFn: () => fetchRecordings(songId),
  });
  const [editing, setEditing] = useState<SongVideo | null>(null);

  if (isLoading)
    return <p className="text-sm text-muted-foreground">{t('productionLoadingRecordings')}</p>;
  if (data.length === 0)
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-4 text-center">
        <Video className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
        {/* There is no upload control on this tab yet — don't tell the teacher
            to use one that isn't there. */}
        <p className="text-sm text-muted-foreground">{t('productionRecordingListEmpty')}</p>
      </div>
    );

  return (
    <>
      <ul className="space-y-2">
        {data.map((rec) => (
          <li
            key={rec.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-card px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{rec.title || rec.filename}</div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Badge className={STATUS_TONE[rec.production_status]}>
                  {t(STATUS_LABEL_KEYS[rec.production_status])}
                </Badge>
                {rec.is_recording_correct && <span>· {t('productionTakeOkTag')}</span>}
                {rec.is_well_lit && <span>· {t('productionLitTag')}</span>}
                {rec.is_audio_mixed && <span>· {t('productionMixedTag')}</span>}
                {rec.is_video_edited && <span>· {t('productionStatusEdited')}</span>}
                {rec.mic_type && <span>· {rec.mic_type}</span>}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(rec)}>
              <Sliders className="mr-1 h-4 w-4" />
              {t('productionQualityButton')}
            </Button>
          </li>
        ))}
      </ul>

      <ResponsiveDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t('productionRecordingQualityTitle')}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          {editing && (
            <RecordingQualityForm
              songId={songId}
              recording={editing}
              onSaved={() => setEditing(null)}
            />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
