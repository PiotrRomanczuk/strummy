'use client';

import { useState } from 'react';
import type { SongSection } from '@/components/songs/types';
import { saveSongSection } from '@/app/actions/song-sections';
import { useRouter } from 'next/navigation';

type Props = {
  songId: string;
  section: SongSection | null;
  onClose: () => void;
};

export const EditSongSectionModal = ({ songId, section, onClose }: Props) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      id: section?.id,
      song_id: songId,
      section_type: formData.get('section_type') as string,
      section_number: formData.get('section_number') ? Number(formData.get('section_number')) : null,
      order_position: Number(formData.get('order_position')),
      chords: formData.get('chords')
        ? (formData.get('chords') as string).split(/[\s,]+/).filter(Boolean)
        : [],
      lyrics: (formData.get('lyrics') as string) || null,
      tab_notation: (formData.get('tab_notation') as string) || null,
      notes: (formData.get('notes') as string) || null,
    };

    const res = await saveSongSection(data);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.refresh();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: 'var(--ivory)', padding: 24, borderRadius: 8, width: 500, maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto',
        color: 'var(--ink)'
      }}>
        <h2 style={{ fontFamily: 'var(--font-fraunces)' }}>{section ? 'Edit Section' : 'Add Section'}</h2>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>Type</span>
            <input name="section_type" defaultValue={section?.section_type ?? 'verse'} required style={{ padding: 8, borderRadius: 4, border: '1px solid var(--rule)' }} />
          </label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>Number (optional)</span>
              <input name="section_number" type="number" defaultValue={section?.section_number ?? ''} style={{ padding: 8, borderRadius: 4, border: '1px solid var(--rule)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>Order Position</span>
              <input name="order_position" type="number" defaultValue={section?.order_position ?? 1} required style={{ padding: 8, borderRadius: 4, border: '1px solid var(--rule)' }} />
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>Chords</span>
            <textarea name="chords" defaultValue={section?.chords?.join(' ') ?? ''} style={{ padding: 8, borderRadius: 4, border: '1px solid var(--rule)', minHeight: 80, fontFamily: 'var(--font-geist-mono)' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-geist-mono)' }}>Lyrics</span>
            <textarea name="lyrics" defaultValue={section?.lyrics ?? ''} style={{ padding: 8, borderRadius: 4, border: '1px solid var(--rule)', minHeight: 80 }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--ink)', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '8px 16px', background: 'var(--ink)', color: 'var(--ivory)', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};
