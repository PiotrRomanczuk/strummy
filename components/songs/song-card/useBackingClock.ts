'use client';

import { useEffect, useRef, useState } from 'react';

import type { SongCard } from '@/lib/music-theory/song-card';
import {
  chordNotes,
  nextStep,
  secondsAt,
  type BackingStep,
} from '@/lib/music-theory/song-card-backing';
import { cardPosition, chordAt, type StrumMark } from '@/lib/music-theory/song-card-clock';

type Tone = typeof import('tone');
type Voices = { guitar: InstanceType<Tone['PolySynth']>; click: InstanceType<Tone['Synth']> };

type Options = {
  card: SongCard;
  /** The strum marks of a bar (the part's, after the teacher's corrections). */
  strumOf: (bar: number) => StrumMark[] | null;
  loop: { firstBar: number; lastBar: number } | null;
  /** Called on every sixteenth with its place in the recording, so the card moves as if the recording played. */
  onTime: (seconds: number) => void;
};

const midi = (Tone: Tone, note: number) => Tone.Frequency(note, 'midi').toNote();

function voicesFor(Tone: Tone): Voices {
  const guitar = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.002, decay: 0.3, sustain: 0.05, release: 0.4 },
    volume: -10,
  }).toDestination();
  const click = new Tone.Synth({
    oscillator: { type: 'square' },
    envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.01 },
    volume: -18,
  }).toDestination();
  return { guitar, click };
}

/**
 * The song card's backing track: the card's chords strummed in the card's strum, plus a metronome, at 40–100% of
 * the recording's tempo. Tone.js loads on the first play (it needs a click to start audio anyway).
 */
export function useBackingClock({ card, strumOf, loop, onTime }: Options) {
  const [isPlaying, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.7);
  const tone = useRef<{ Tone: Tone; voices: Voices } | null>(null);
  const step = useRef<BackingStep>({ bar: 0, slot: 0 });
  const live = useRef({ strumOf, loop, onTime });

  useEffect(() => {
    live.current = { strumOf, loop, onTime };
  });
  useEffect(() => {
    if (tone.current) tone.current.Tone.getTransport().bpm.value = card.bpm * rate;
  }, [card.bpm, rate]);
  useEffect(
    () => () => {
      tone.current?.Tone.getTransport().stop();
    },
    []
  );

  const play = (Tone: Tone, voices: Voices, time: number) => {
    const { bar, slot } = step.current;
    const mark = live.current.strumOf(bar)?.[slot] ?? null;
    if (mark === 'down' || mark === 'up') {
      const notes = chordNotes(chordAt(card, bar, slot < 8 ? 0 : 1)).map((n) => midi(Tone, n));
      (mark === 'up' ? notes.reverse() : notes).forEach((note, k) =>
        voices.guitar.triggerAttackRelease(note, '8n', time + k * 0.012, mark === 'up' ? 0.35 : 0.5)
      );
    }
    if (slot % 4 === 0) voices.click.triggerAttackRelease(slot === 0 ? 'C6' : 'G5', '32n', time);
    const at = secondsAt(card, step.current);
    Tone.getDraw().schedule(() => live.current.onTime(at), time);
    const next = nextStep(card, step.current, live.current.loop);
    if (next) step.current = next;
    else Tone.getDraw().schedule(() => stop(), time);
  };

  const start = async (fromSeconds: number) => {
    const Tone = tone.current?.Tone ?? (await import('tone'));
    await Tone.start();
    tone.current ??= { Tone, voices: voicesFor(Tone) };
    const { voices } = tone.current;
    const position = cardPosition(card, fromSeconds);
    step.current = { bar: position.bar, slot: Math.max(0, position.slot) };
    const transport = Tone.getTransport();
    transport.cancel();
    transport.bpm.value = card.bpm * rate;
    transport.scheduleRepeat((time) => play(Tone, voices, time), '16n');
    transport.start();
    setPlaying(true);
  };

  const stop = () => {
    const transport = tone.current?.Tone.getTransport();
    transport?.stop();
    transport?.cancel();
    setPlaying(false);
  };

  return { isPlaying, rate, setRate, start, stop };
}

export type BackingClock = ReturnType<typeof useBackingClock>;
