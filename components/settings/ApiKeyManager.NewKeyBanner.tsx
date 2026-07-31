'use client';

import { useTranslations } from 'next-intl';
import type { NewKeyResponse } from './api-key-manager.types';

interface Props {
  newKey: NewKeyResponse;
  onCopy: () => void;
  onClose: () => void;
}

/** Shown once, right after a key is created — the only time the raw secret is visible. */
export function ApiKeyManagerNewKeyBanner({ newKey, onCopy, onClose }: Props) {
  const t = useTranslations('Settings');

  return (
    <div className="rounded-md bg-primary/10 p-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">{t('apiKeysCreatedHeading')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{newKey.warning}</p>
        <div className="mt-4 p-3 bg-background rounded border border-border">
          <p className="text-xs text-muted-foreground mb-1">{t('apiKeysKeyLabel')}</p>
          <code className="text-sm font-mono break-all">{newKey.key}</code>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCopy}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            {t('apiKeysCopyButton')}
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-muted text-muted-foreground rounded hover:bg-muted/80"
          >
            {t('apiKeysCloseButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
