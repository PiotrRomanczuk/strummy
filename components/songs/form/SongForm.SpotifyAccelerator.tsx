'use client';

import { useEffect, useRef, useState } from 'react';
import { SpotifyAcceleratorView } from './SongForm.SpotifyAccelerator.View';

export type SearchResult = {
  id: string;
  name: string;
  artist: string;
  coverUrl?: string;
  duration_ms: number;
  release_date: string;
};

export type SpotifyAutoFill = {
  title: string;
  author: string;
  spotifyLinkUrl: string;
  coverImageUrl: string | null;
  durationMs: number;
  releaseYear?: number;
  key?: string;
  tempo?: number;
  timeSignature?: number;
};

const PITCH_CLASS: Record<number, string> = {
  0: 'C',
  1: 'C#',
  2: 'D',
  3: 'D#',
  4: 'E',
  5: 'F',
  6: 'F#',
  7: 'G',
  8: 'G#',
  9: 'A',
  10: 'A#',
  11: 'B',
};
const mapKey = (pitchClass: number, mode: number): string | undefined => {
  const note = PITCH_CLASS[pitchClass];
  return note ? (mode === 0 ? `${note}m` : note) : undefined;
};
const releaseYearOf = (date: string): number | undefined => {
  const year = parseInt(date, 10);
  return Number.isFinite(year) && year >= 1500 && year <= 2100 ? year : undefined;
};

type Props = { onAutoFill: (draft: SpotifyAutoFill) => void };

/** Debounced Spotify track search that auto-fills the form from a selection.
 * Reuses the existing /api/spotify/search + /api/spotify/features endpoints —
 * no new backend, this is purely the interactive search-and-fill UI. */
export const SongFormSpotifyAccelerator = ({ onAutoFill }: Props) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [matched, setMatched] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (matched || query.trim().length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}&type=track`);
        if (!res.ok) return;
        const body = (await res.json()) as { results?: SearchResult[] };
        setResults(body.results ?? []);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, matched]);

  const selectResult = async (result: SearchResult) => {
    setMatched(result);
    setResults([]);
    let key: string | undefined;
    let tempo: number | undefined;
    let timeSignature: number | undefined;
    try {
      const res = await fetch(`/api/spotify/features?id=${result.id}`);
      if (res.ok) {
        const features = (await res.json()) as {
          key: number;
          mode: number;
          tempo: number;
          time_signature: number;
        };
        key = mapKey(features.key, features.mode);
        tempo = features.tempo > 0 ? Math.round(features.tempo) : undefined;
        timeSignature = features.time_signature > 0 ? features.time_signature : undefined;
      }
    } catch {
      // Audio features are a bonus — title/author/link/cover still autofill without them.
    }
    onAutoFill({
      title: result.name,
      author: result.artist,
      spotifyLinkUrl: `https://open.spotify.com/track/${result.id}`,
      coverImageUrl: result.coverUrl ?? null,
      durationMs: result.duration_ms,
      releaseYear: releaseYearOf(result.release_date),
      key,
      tempo,
      timeSignature,
    });
  };

  return (
    <SpotifyAcceleratorView
      query={query}
      matched={matched}
      results={results}
      isSearching={isSearching}
      onQuery={(v) => {
        setMatched(null);
        setQuery(v);
      }}
      onReset={() => {
        setMatched(null);
        setQuery('');
      }}
      onSelect={selectResult}
    />
  );
};
