'use client';

import { useState } from 'react';

import type { SongLevel } from '@/components/shared/level-label.helpers';
import type { SpotifyAutoFill } from './SongForm.SpotifyAccelerator';
import type { UltimateGuitarDraft } from './ultimate-guitar.types';

export type SongFormInitial = Partial<{
  title: string;
  author: string;
  level: SongLevel;
  key: string;
  capoFret: number | null;
  tempo: number | null;
  timeSignature: number | null;
  releaseYear: number | null;
  chords: string[];
  strumming: string;
  notes: string;
  lyrics: string;
  category: string;
  youtubeUrl: string;
  spotifyLinkUrl: string;
  ultimateGuitarLink: string;
  tiktokShortUrl: string;
  coverImageUrl: string | null;
}>;

/**
 * Every controlled field of the song form, in one place, so the Spotify
 * accelerator, the UG import, the AI notes and the live preview all read and
 * write the same values.
 */
export function useSongFormState(initial: SongFormInitial = {}) {
  const [title, setTitle] = useState(initial.title ?? '');
  const [author, setAuthor] = useState(initial.author ?? '');
  const [level, setLevel] = useState<SongLevel>(initial.level ?? 'beginner');
  const [key, setKey] = useState(initial.key ?? 'C');
  const [capoFret, setCapoFret] = useState<number | null>(initial.capoFret ?? null);
  const [tempo, setTempo] = useState<number | null>(initial.tempo ?? null);
  const [timeSignature, setTimeSignature] = useState<number | null>(initial.timeSignature ?? null);
  const [releaseYear, setReleaseYear] = useState<number | null>(initial.releaseYear ?? null);
  const [chords, setChords] = useState<string[]>(initial.chords ?? []);
  const [strumming, setStrumming] = useState(initial.strumming ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [lyrics, setLyrics] = useState(initial.lyrics ?? '');
  const [category, setCategory] = useState(initial.category ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl ?? '');
  const [spotifyLinkUrl, setSpotifyLinkUrl] = useState(initial.spotifyLinkUrl ?? '');
  const [ultimateGuitarLink, setUltimateGuitarLink] = useState(initial.ultimateGuitarLink ?? '');
  const [tiktokShortUrl, setTiktokShortUrl] = useState(initial.tiktokShortUrl ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initial.coverImageUrl ?? null);

  const applySpotify = (fill: SpotifyAutoFill) => {
    setTitle(fill.title);
    setAuthor(fill.author);
    setSpotifyLinkUrl(fill.spotifyLinkUrl);
    setCoverImageUrl(fill.coverImageUrl);
    if (fill.releaseYear) setReleaseYear(fill.releaseYear);
    if (fill.key) setKey(fill.key);
    if (fill.tempo) setTempo(fill.tempo);
    if (fill.timeSignature) setTimeSignature(fill.timeSignature);
  };

  const applyUltimateGuitar = (draft: UltimateGuitarDraft) => {
    if (draft.title) setTitle(draft.title);
    if (draft.author) setAuthor(draft.author);
    if (draft.level) setLevel(draft.level);
    if (draft.key) setKey(draft.key);
    if (draft.capoFret !== undefined) setCapoFret(draft.capoFret);
    if (draft.chords.length > 0) setChords(draft.chords);
    if (draft.lyricsWithChords) setLyrics(draft.lyricsWithChords);
    if (draft.ultimateGuitarLink) setUltimateGuitarLink(draft.ultimateGuitarLink);
  };

  const counts = {
    essentials: [title, author, level, key].filter(Boolean).length,
    resources: [youtubeUrl, spotifyLinkUrl, ultimateGuitarLink, tiktokShortUrl].filter(Boolean)
      .length,
    musical:
      [capoFret, tempo, timeSignature, releaseYear].filter((v) => v !== null).length +
      (strumming ? 1 : 0) +
      (chords.length > 0 ? 1 : 0),
    content: [lyrics, notes, coverImageUrl].filter(Boolean).length,
  };

  return {
    values: {
      title,
      author,
      level,
      key,
      capoFret,
      tempo,
      timeSignature,
      releaseYear,
      chords,
      strumming,
      notes,
      lyrics,
      category,
      youtubeUrl,
      spotifyLinkUrl,
      ultimateGuitarLink,
      tiktokShortUrl,
      coverImageUrl,
    },
    set: {
      setTitle,
      setAuthor,
      setLevel,
      setKey,
      setCapoFret,
      setTempo,
      setTimeSignature,
      setReleaseYear,
      setChords,
      setStrumming,
      setNotes,
      setLyrics,
      setCategory,
      setYoutubeUrl,
      setSpotifyLinkUrl,
      setUltimateGuitarLink,
      setTiktokShortUrl,
      setCoverImageUrl,
    },
    applySpotify,
    applyUltimateGuitar,
    counts,
  };
}

export type SongFormState = ReturnType<typeof useSongFormState>;
