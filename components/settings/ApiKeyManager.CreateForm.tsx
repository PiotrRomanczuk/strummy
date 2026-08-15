'use client';

import { useTranslations } from 'next-intl';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isCreating: boolean;
}

export function ApiKeyManagerCreateForm({ value, onChange, onSubmit, isCreating }: Props) {
  const t = useTranslations('Settings');

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('apiKeysCreateSectionTitle')}
      </h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
            {t('apiKeysNameLabel')}
          </label>
          <input
            type="text"
            id="name"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('apiKeysNamePlaceholder')}
            className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-foreground placeholder-muted-foreground bg-background focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isCreating}
          />
        </div>
        <button
          type="submit"
          disabled={isCreating}
          className="inline-flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
        >
          {isCreating ? t('apiKeysCreatingButton') : t('apiKeysCreateButton')}
        </button>
      </form>
    </div>
  );
}
