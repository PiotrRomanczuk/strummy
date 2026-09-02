import { OPEN_STRING_MIDI } from './fretboard.constants';

/**
 * A minimal plucked-string voice for the fretboard, built straight on
 * WebAudio: a sawtooth through a decaying lowpass, with an exponential amp
 * envelope. No samples, no dependency — enough to hear the note you tapped.
 *
 * Every entry point degrades to a no-op when WebAudio is unavailable (jsdom,
 * older Safari without a user gesture), so callers never need to guard.
 */

type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** True when the browser can play tones at all. */
export function isAudioSupported(): boolean {
  return audioContextCtor() !== null;
}

/** MIDI note number for a board cell (row 0 = high e, fret 0 = open). */
export function noteMidi(row: number, fret: number): number {
  return (OPEN_STRING_MIDI[row] ?? OPEN_STRING_MIDI[0]) + fret;
}

/** Equal-tempered frequency of a MIDI note, A4 (69) = 440 Hz. */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function ensureContext(): AudioContext | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    // Creating a context can throw (hardware unavailable, too many contexts);
    // a tap that makes no sound is fine, one that breaks the board is not.
    if (!context) context = new Ctor();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    context = null;
    return null;
  }
}

/**
 * Pluck one note. `volume` is the 0–100 slider value; `duration` is the ring
 * time in seconds.
 */
export function playPluck(midi: number, volume: number, duration = 1.1): void {
  const ctx = ensureContext();
  if (!ctx || volume <= 0) return;

  const now = ctx.currentTime;
  const frequency = midiToFrequency(midi);
  const peak = Math.min(0.35, (volume / 100) * 0.35);

  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(frequency, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(frequency * 6, 6000), now);
  filter.frequency.exponentialRampToValueAtTime(Math.max(frequency * 1.4, 220), now + duration);

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(filter).connect(amp).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

/** Release the shared AudioContext (used on unmount). */
export function closeAudio(): void {
  if (context && context.state !== 'closed') void context.close();
  context = null;
}
