'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { LAST_FRET } from './fretboard.constants';
import { closeAudio, isAudioSupported, noteMidi, playPluck } from './fretboard-audio.helpers';
import type { AnnotatedCell, BoardCell } from './fretboard.helpers';

/** WebAudio availability never changes within a session — nothing to subscribe to. */
const subscribeNever = () => () => {};

/** The string the walkthrough runs along: display row 2 = the G string. */
const WALK_ROW = 2;
const MAX_STEPS = 8;

/** Positions to step through: the active notes on one string, low to high. */
function walkPositions(board: AnnotatedCell[][]): BoardCell[] {
  const row = board[WALK_ROW] ?? [];
  const positions: BoardCell[] = [];
  for (let fret = 0; fret <= LAST_FRET && positions.length < MAX_STEPS; fret++) {
    if (row[fret]?.active) positions.push({ row: WALK_ROW, fret });
  }
  return positions;
}

export interface FretboardPlayback {
  playing: boolean;
  playingCell: BoardCell | null;
  bpm: number;
  setBpm: (value: number) => void;
  volume: number;
  setVolume: (value: number) => void;
  audioOn: boolean;
  setAudioOn: (value: boolean) => void;
  audioSupported: boolean;
  togglePlay: () => void;
  pluck: (row: number, fret: number) => void;
}

/**
 * Playback for the explorer: tapping a note plucks it, and "Play notes" walks
 * the current scale or chord up one string at the chosen tempo.
 */
export function useFretboardPlayback(board: AnnotatedCell[][]): FretboardPlayback {
  const [playing, setPlaying] = useState(false);
  const [playingCell, setPlayingCell] = useState<BoardCell | null>(null);
  const [bpm, setBpm] = useState(120);
  const [volume, setVolume] = useState(70);
  const [audioOn, setAudioOn] = useState(true);
  // Read through useSyncExternalStore so the server snapshot (no WebAudio)
  // and the first client render agree, then settle on the real answer.
  const audioSupported = useSyncExternalStore(subscribeNever, isAudioSupported, () => false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors the live settings for the timer callbacks, which outlive a render.
  const settings = useRef({ audioOn, volume, bpm, board });
  useEffect(() => {
    settings.current = { audioOn, volume, bpm, board };
  }, [audioOn, volume, bpm, board]);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPlaying(false);
    setPlayingCell(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      closeAudio();
    };
  }, []);

  const pluck = useCallback((row: number, fret: number) => {
    const { audioOn: on, volume: vol } = settings.current;
    if (!on) return;
    playPluck(noteMidi(row, fret), vol);
  }, []);

  const togglePlay = useCallback(() => {
    if (timer.current || playing) {
      stop();
      return;
    }
    if (walkPositions(settings.current.board).length === 0) return;

    setPlaying(true);
    let step = 0;
    const tick = () => {
      // Re-read the board every beat: the key, scale or mode can change
      // mid-walk, and a walk that outlived its notes (Off mode empties them)
      // would otherwise keep pulsing positions nobody can stop.
      const positions = walkPositions(settings.current.board);
      if (step >= positions.length) {
        stop();
        return;
      }
      const position = positions[step];
      setPlayingCell(position);
      pluck(position.row, position.fret);
      step += 1;
      timer.current = setTimeout(tick, 60_000 / settings.current.bpm);
    };
    tick();
  }, [playing, pluck, stop]);

  return {
    playing,
    playingCell,
    bpm,
    setBpm,
    volume,
    setVolume,
    audioOn,
    setAudioOn,
    audioSupported,
    togglePlay,
    pluck,
  };
}
