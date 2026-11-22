import Link from 'next/link';

import type { SourceRow } from '@/lib/private-data/private-data.types';
import { getTab } from '@/lib/private-data/tabs';

import { LAB_PATH } from '../lab.helpers';

type Props = { row: SourceRow; bestLabel: string };

/** The tab versions of a song, best first, each opening in the tab player. */
export function LabTabLinks({ row, bestLabel }: Props) {
  const best = typeof row.best_sha1 === 'string' ? row.best_sha1 : null;
  const shas = Array.isArray(row.sha1s) ? (row.sha1s as string[]) : [];
  const ordered = best ? [best, ...shas.filter((sha) => sha !== best)] : shas;
  return (
    <ul className="space-y-1 text-sm">
      {ordered.map((sha1) => {
        const tab = getTab(sha1);
        return (
          <li key={sha1}>
            <Link href={`${LAB_PATH}/tabs/${sha1}`} className="underline-offset-2 hover:underline">
              {tab ? `${tab.title} · ${tab.format}` : sha1.slice(0, 10)}
            </Link>
            <span className="ml-2 text-xs text-muted-foreground">
              {tab && tab.roles.join(', ')}
              {sha1 === best && ` · ${bestLabel}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
