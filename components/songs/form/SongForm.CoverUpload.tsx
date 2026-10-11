'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { uploadSongCover, validateSongCoverFile } from '@/lib/storage/songCover';
import { songMonoInput } from './song-form.styles';

const tileStyle: React.CSSProperties = {
  aspectRatio: '1',
  borderRadius: 8,
  position: 'relative',
  overflow: 'hidden',
};

const errorStyle: React.CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: 'var(--danger)',
  fontFamily: 'var(--mono)',
};

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Present in the edit flow — makes the object path deterministic (overwrite). */
  songId?: string;
};

/**
 * Cover-image field for the song forms. The resolved public URL lives
 * in the parent's controlled `value` (the parent carries it in a hidden
 * `cover_image_url` input and the live Preview). The URL text input stays
 * visible as a manual-entry fallback.
 *
 * File upload needs a Supabase Storage service. Stacks without one (the
 * StudentDevelopment stack has no storage-api container) set
 * NEXT_PUBLIC_SONG_COVER_UPLOAD_ENABLED=false to hide the button; the URL field
 * still works there.
 */
const isUploadEnabled = process.env.NEXT_PUBLIC_SONG_COVER_UPLOAD_ENABLED !== 'false';

export const SongFormCoverUpload = ({ value, onChange, songId }: Props) => {
  const t = useTranslations('Songs');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const validation = validateSongCoverFile(file);
    if (!validation.valid) {
      setError(validation.error ?? t('formCoverInvalidFileFallback'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();
      const result = await uploadSongCover(supabase, file, songId);
      if ('error' in result) setError(result.error);
      else onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('formCoverUploadFailedFallback'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Claude Design "Images" grid: the cover tile (★ COVER), then a dashed "+ Add".
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
        {value && (
          <div style={{ ...tileStyle, background: 'var(--rule-2)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL */}
            <img src={value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                padding: '2px 6px',
                background: 'rgba(0,0,0,.6)',
                color: 'var(--gold-dim)',
                borderRadius: 4,
                fontSize: 9,
                fontFamily: 'var(--mono)',
                letterSpacing: '.08em',
              }}
            >
              ★ {t('formCoverBadge')}
            </span>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={t('formRemoveCoverImageAria')}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 20,
                height: 20,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(0,0,0,.6)',
                color: 'var(--on-accent)',
                cursor: 'pointer',
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}
        {isUploadEnabled && (
          <label
            style={{
              ...tileStyle,
              border: '1.5px dashed var(--rule)',
              color: 'var(--ink-4)',
              fontSize: 11,
              cursor: isUploading ? 'wait' : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 14 }}>+</span>
            {isUploading ? t('formUploadingLabel') : t('formAddImageLabel')}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>
        )}
      </div>
      <input
        type="url"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={t('formCoverUrlPlaceholder')}
        aria-label={t('formCoverUrlAria')}
        style={{ ...songMonoInput, fontSize: 12, marginTop: 10 }}
      />
      {error && (
        <div data-testid="song-cover-upload-error" style={errorStyle}>
          {error}
        </div>
      )}
    </div>
  );
};
