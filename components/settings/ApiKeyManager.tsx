'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { logger } from '@/lib/logger';
import { ApiKeyManagerNewKeyBanner } from './ApiKeyManager.NewKeyBanner';
import { ApiKeyManagerCreateForm } from './ApiKeyManager.CreateForm';
import { ApiKeyManagerList } from './ApiKeyManager.List';
import type { ApiKey, NewKeyResponse } from './apiKeyManager.types';

export function ApiKeyManager() {
  const t = useTranslations('Settings');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showNewKey, setShowNewKey] = useState<NewKeyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  async function fetchApiKeys() {
    try {
      setLoading(true);
      const response = await fetch('/api/api-keys');

      if (!response.ok) {
        throw new Error(t('apiKeysFetchError'));
      }

      const data = await response.json();
      setApiKeys(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('apiKeysGenericError'));
      logger.error('Error fetching API keys:', err);
    } finally {
      setLoading(false);
    }
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();

    if (!newKeyName.trim()) {
      setError(t('apiKeysNameRequired'));
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('apiKeysCreateError'));
      }

      const newKey = await response.json();
      setShowNewKey(newKey);
      setNewKeyName('');
      setSuccess(t('apiKeysCreateSuccess'));
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('apiKeysGenericError'));
      logger.error('Error creating API key:', err);
    } finally {
      setCreating(false);
    }
  }

  async function deleteApiKey(id: string) {
    if (!confirm(t('apiKeysDeleteConfirm'))) {
      return;
    }

    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(t('apiKeysDeleteError'));
      }

      setSuccess(t('apiKeysDeleteSuccess'));
      setError(null);
      await fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('apiKeysGenericError'));
      logger.error('Error deleting API key:', err);
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('apiKeysNever');
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{t('apiKeysTitle')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t('apiKeysDescription')}</p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-destructive">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-success/10 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-success">{success}</p>
            </div>
          </div>
        </div>
      )}

      {showNewKey && (
        <ApiKeyManagerNewKeyBanner
          newKey={showNewKey}
          onCopy={() => {
            navigator.clipboard.writeText(showNewKey.key);
            setSuccess(t('apiKeysCopiedToClipboard'));
          }}
          onClose={() => setShowNewKey(null)}
        />
      )}

      <ApiKeyManagerCreateForm
        value={newKeyName}
        onChange={setNewKeyName}
        onSubmit={createApiKey}
        isCreating={creating}
      />

      <ApiKeyManagerList
        apiKeys={apiKeys}
        isLoading={loading}
        onDelete={deleteApiKey}
        formatDate={formatDate}
      />
    </div>
  );
}
