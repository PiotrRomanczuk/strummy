'use client';

import { useTranslations } from 'next-intl';
import type { ApiKey } from './apiKeyManager.types';

interface Props {
  apiKeys: ApiKey[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  formatDate: (dateString: string | null) => string;
}

export function ApiKeyManagerList({ apiKeys, isLoading, onDelete, formatDate }: Props) {
  const t = useTranslations('Settings');

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
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('apiKeysColName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('apiKeysColCreated')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('apiKeysColLastUsed')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('apiKeysColStatus')}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('apiKeysColActions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {apiKeys.map((key) => (
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
