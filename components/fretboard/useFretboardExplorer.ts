'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import {
  getActiveCAGEDShapes,
  getChordNotes,
  getScaleNotes,
  type CagedPosition,
  type NoteName,
} from '@/lib/music-theory';

import { LAST_FRET, type FretboardStyle } from './fretboard.constants';
import {
  annotateBoard,
  parseStateFromSearch,
  stateToSearch,
  FRETBOARD_PATHS,
  type AnnotatedCell,
  type BoardCell,
  type CagedSelection,
  type FretMode,
  type FretState,
} from './fretboard.helpers';
import { useFretboardPlayback, type FretboardPlayback } from './useFretboardPlayback';

const DEFAULT_STATE: FretState = {
  key: 'A',
  mode: 'scale',
  scaleKey: 'pentatonic_minor',
  chordKey: 'minor',
  caged: 'none',
  style: 'engraved',
};

export interface SelectedCell extends BoardCell {
  note: NoteName;
}

/**
 * Which surface the tool is mounted on. The board is identical on both; only
 * the links around it differ — a link copied from the free public page must
 * open the free public page, and its "quiz me" nudge has to lead somewhere a
 * signed-out visitor can actually go.
 */
export type FretboardVariant = 'dashboard' | 'public';

export interface FretboardLinks {
  /** Base path for the shareable link. */
  base: string;
  /** Where the "quiz me on these notes" nudge points. */
  quiz: string;
}

const LINKS: Record<FretboardVariant, FretboardLinks> = {
  dashboard: { base: FRETBOARD_PATHS.dashboard, quiz: '/dashboard/skills' },
  // Self-service sign-up is closed (see app/(auth)/sign-up/page.tsx), so a
  // signed-out visitor is sent to the demo studio, where the quiz actually runs.
  public: { base: FRETBOARD_PATHS.public, quiz: '/sign-in?demo=true' },
};

export interface FretboardExplorerApi extends FretState {
  setKey: (note: NoteName) => void;
  setMode: (mode: FretMode) => void;
  setScaleKey: (key: string) => void;
  setChordKey: (key: string) => void;
  setCaged: (value: CagedSelection) => void;
  setStyle: (value: FretboardStyle) => void;
  useFlats: boolean;
  setUseFlats: (value: boolean) => void;
  showIntervals: boolean;
  setShowIntervals: (value: boolean) => void;
  hideNonScale: boolean;
  setHideNonScale: (value: boolean) => void;
  highlightRoot: boolean;
  setHighlightRoot: (value: boolean) => void;
  selected: SelectedCell | null;
  selectCell: (row: number, fret: number, note: NoteName) => void;
  activeNotes: NoteName[];
  board: AnnotatedCell[][];
  cagedPositions: CagedPosition[];
  cagedZones: CagedPosition[];
  playback: FretboardPlayback;
  links: FretboardLinks;
  variant: FretboardVariant;
}

export function useFretboardExplorer(
  variant: FretboardVariant = 'dashboard'
): FretboardExplorerApi {
  // Seed state from the URL on first render (consistent across SSR/hydration).
  const searchParams = useSearchParams();
  const initial = parseStateFromSearch(searchParams.toString(), DEFAULT_STATE);

  const [key, setKey] = useState<NoteName>(initial.key);
  const [mode, setMode] = useState<FretMode>(initial.mode);
  const [scaleKey, setScaleKey] = useState(initial.scaleKey);
  const [chordKey, setChordKey] = useState(initial.chordKey);
  const [caged, setCaged] = useState<CagedSelection>(initial.caged);
  const [style, setStyle] = useState<FretboardStyle>(initial.style);
  const [useFlats, setUseFlats] = useState(false);
  const [showIntervals, setShowIntervals] = useState(false);
  const [hideNonScale, setHideNonScale] = useState(false);
  const [highlightRoot, setHighlightRoot] = useState(true);
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  // Persist state to the URL so the current view is shareable.
  useEffect(() => {
    const search = stateToSearch({ key, mode, scaleKey, chordKey, caged, style });
    window.history.replaceState(null, '', `${window.location.pathname}${search}`);
  }, [key, mode, scaleKey, chordKey, caged, style]);

  const activeNotes = useMemo<NoteName[]>(() => {
    if (mode === 'scale') return getScaleNotes(key, scaleKey);
    if (mode === 'chord') return getChordNotes(key, chordKey);
    return [];
  }, [mode, key, scaleKey, chordKey]);

  const board = useMemo(() => annotateBoard(key, activeNotes), [key, activeNotes]);

  const cagedPositions = useMemo(() => getActiveCAGEDShapes(key, LAST_FRET), [key]);

  const cagedZones = useMemo(() => {
    if (caged === 'none') return [];
    if (caged === 'all') return cagedPositions;
    return cagedPositions.filter((position) => position.shape === caged);
  }, [caged, cagedPositions]);

  const playback = useFretboardPlayback(board);
  const { pluck } = playback;

  const selectCell = useCallback(
    (row: number, fret: number, note: NoteName) => {
      setSelected({ row, fret, note });
      pluck(row, fret);
    },
    [pluck]
  );

  return {
    key,
    setKey,
    mode,
    setMode,
    scaleKey,
    setScaleKey,
    chordKey,
    setChordKey,
    caged,
    setCaged,
    style,
    setStyle,
    useFlats,
    setUseFlats,
    showIntervals,
    setShowIntervals,
    hideNonScale,
    setHideNonScale,
    highlightRoot,
    setHighlightRoot,
    selected,
    selectCell,
    activeNotes,
    board,
    cagedPositions,
    cagedZones,
    playback,
    links: LINKS[variant],
    variant,
  };
}
