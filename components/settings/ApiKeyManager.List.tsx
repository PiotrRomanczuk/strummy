'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useSortableTable } from '@/hooks/useSortableTable';
import { cn } from '@/lib/utils';
import type { ApiKey } from './api-key-manager.types';

interface Props {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  formatDate: (dateString: string | null) => string;
}

export function ApiKeyManagerList({ apiKeys, isLoading, onDelete, formatDate }: Props) {
  const t = useTranslations('Settings');
  const { sortedItems, sortKey, direction, toggleSort } = useSortableTable(apiKeys);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <h3 className="text-lg font-semibold text-foreground p-6 border-b border-border">
        {t('apiKeysListTitle')}
      </h3>

      {isLoading ? (
        <div className="p-6 text-center text-muted-foreground">{t('apiKeysLoading')}</div>
      ) : apiKeys.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">{t('apiKeysEmptyState')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <SortableTh
                  sortKey="name"
                  activeSortKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                >
                  {t('apiKeysColName')}
                </SortableTh>
                <SortableTh
                  sortKey="created_at"
                  activeSortKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                >
                  {t('apiKeysColCreated')}
                </SortableTh>
                <SortableTh
                  sortKey="last_used_at"
                  activeSortKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                >
                  {t('apiKeysColLastUsed')}
                </SortableTh>
                <SortableTh
                  sortKey="is_active"
                  activeSortKey={sortKey}
                  direction={direction}
                  onSort={toggleSort}
                >
                  {t('apiKeysColStatus')}
                </SortableTh>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('apiKeysColActions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {sortedItems.map((key) => (
                <tr key={key.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {key.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(key.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(key.last_used_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        key.is_active
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {key.is_active ? t('apiKeysStatusActive') : t('apiKeysStatusInactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => onDelete(key.id)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      {t('apiKeysDeleteAction')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface SortableThProps {
  sortKey: string;
  activeSortKey: string | null;
  direction: 'asc' | 'desc';
  onSort: (key: string) => void;
  children: React.ReactNode;
}

function SortableTh({ sortKey, activeSortKey, direction, onSort, children }: SortableThProps) {
  const isActive = activeSortKey === sortKey;
  const Icon = isActive ? (direction === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground transition-colors normal-case',
          isActive ? 'text-foreground' : 'text-muted-foreground'
        )}
        aria-label={`Sort by ${sortKey}`}
      >
        {children}
        <Icon className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  );
}
