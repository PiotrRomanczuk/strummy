'use client';

import { useEffect, useState, useTransition } from 'react';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  deleteFretboardPreset,
  listFretboardPresets,
  saveFretboardPreset,
  type FretboardPreset,
} from '@/app/actions/fretboard-presets';

const chip = {
  padding: '6px 12px',
  border: '1px solid var(--rule)',
  background: 'var(--card)',
  color: 'var(--ink-2)',
  borderRadius: 6,
  fontSize: 11,
  cursor: 'pointer',
} as const;

/**
 * "Save preset" beside Copy link (Claude Design fretboard), plus the saved
 * presets. A preset stores the shareable query string, so opening one is
 * just following its link.
 */
export const FretboardPresets = ({ query, basePath }: { query: string; basePath: string }) => {
  const t = useTranslations('Fretboard.presets');
  const [presets, setPresets] = useState<FretboardPreset[]>([]);
  const [isNaming, setIsNaming] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    listFretboardPresets()
      .then(setPresets)
      .catch(() => setPresets([]));
  }, []);

  const save = () =>
    startTransition(async () => {
      const result = await saveFretboardPreset({ name, query });
      if ('error' in result) return setError(t('saveFailed'));
      setPresets((prev) => [result.data, ...prev]);
      setIsNaming(false);
      setName('');
      setError(null);
    });

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteFretboardPreset(id);
      if (!('error' in result)) setPresets((prev) => prev.filter((p) => p.id !== id));
    });

  return (
    <>
      {isNaming ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          style={{ display: 'flex', gap: 6, flexBasis: '100%' }}
        >
          <input
            autoFocus
            data-testid="fb-preset-name"
            aria-label={t('namePlaceholder')}
            placeholder={t('namePlaceholder')}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            style={{ ...chip, flex: 1, minWidth: 0, cursor: 'text', fontSize: 12 }}
          />
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            style={{ ...chip, background: 'var(--ink)', color: 'var(--paper)', border: 'none' }}
          >
            {t('confirm')}
          </button>
          <button type="button" onClick={() => setIsNaming(false)} style={chip}>
            {t('cancel')}
          </button>
        </form>
      ) : (
        <button
          type="button"
          data-testid="fb-save-preset"
          className="ui-fb-chip"
          onClick={() => setIsNaming(true)}
          style={chip}
        >
          {t('save')}
        </button>
      )}
      {error && (
        <p style={{ margin: 0, flexBasis: '100%', fontSize: 11, color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      {presets.length > 0 && (
        <div style={{ marginTop: 6, flexBasis: '100%' }}>
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              color: 'var(--ink-4)',
              marginBottom: 6,
            }}
          >
            {t('label')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} data-testid="fb-presets">
            {presets.map((p) => (
              <span
                key={p.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  border: '1px solid var(--rule)',
                  borderRadius: 999,
                  background: 'var(--card)',
                }}
              >
                <a
                  href={`${basePath}${p.query}`}
                  style={{
                    padding: '4px 4px 4px 10px',
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    textDecoration: 'none',
                  }}
                >
                  {p.name}
                </a>
                <button
                  type="button"
                  aria-label={t('remove', { name: p.name })}
                  onClick={() => remove(p.id)}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '4px 8px 4px 4px',
                    color: 'var(--ink-4)',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
