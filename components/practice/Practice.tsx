import { getTranslations } from 'next-intl/server';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PracticeLogForm, type RepertoireSongOption } from './PracticeLogForm';
import { PracticeHistoryList } from './PracticeHistoryList';
import type { PracticeSessionWithSong } from '@/app/actions/practice';

interface PracticeProps {
  sessions: PracticeSessionWithSong[];
  songs: RepertoireSongOption[];
  /** Students log + undo; staff viewing a student see read-only history. */
  isOwnPractice: boolean;
}

/**
 * Practice surface (spec 05). Log form + session history with
 * same-day undo. Server component — interactivity lives in the leaf
 * client components.
 */
export async function Practice({ sessions, songs, isOwnPractice }: PracticeProps) {
  const t = await getTranslations('Practice');
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t(sessions.length === 1 ? 'summarySingular' : 'summaryPlural', {
            count: sessions.length,
            minutes: totalMinutes,
          })}
        </p>
      </div>

      {isOwnPractice && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('logSessionTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <PracticeLogForm songs={songs} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('historyTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PracticeHistoryList sessions={sessions} canUndo={isOwnPractice} />
        </CardContent>
      </Card>
    </div>
  );
}
