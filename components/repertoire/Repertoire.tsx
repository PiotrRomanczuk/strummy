import { getTranslations } from 'next-intl/server';

import { RepertoireCard } from './RepertoireCard';
import type { StudentRepertoireWithSong } from '@/types/StudentRepertoire';

interface RepertoireProps {
  entries: StudentRepertoireWithSong[];
  /** True when the viewer owns this repertoire (student self-edit notes/difficulty). */
  canEdit: boolean;
}

/**
 * Repertoire surface (spec 05). Lists repertoire entries with status
 * + practice stats; a student may edit own notes/difficulty inline.
 */
export async function Repertoire({ entries, canEdit }: RepertoireProps) {
  const t = await getTranslations('Repertoire');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('pageTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t(entries.length === 1 ? 'subtitleSingular' : 'subtitlePlural', {
            count: entries.length,
          })}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <RepertoireCard key={entry.id} entry={entry} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
