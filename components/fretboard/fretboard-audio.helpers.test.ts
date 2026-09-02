/**
 * Unit tests for the fretboard's WebAudio voice. jsdom has no AudioContext,
 * so the suite installs a minimal stub and asserts the graph we build on it:
 * oscillator → lowpass → gain → destination, with an amp envelope.
 */

import {
  closeAudio,
  isAudioSupported,
  midiToFrequency,
  noteMidi,
  playPluck,
} from './fretboard-audio.helpers';

interface StubParam {
  setValueAtTime: jest.Mock;
  exponentialRampToValueAtTime: jest.Mock;
}

const createParam = (): StubParam => ({
  setValueAtTime: jest.fn(),
  exponentialRampToValueAtTime: jest.fn(),
});

function installAudioStub() {
  const oscillator = {
    type: '',
    frequency: createParam(),
    connect: jest.fn(() => filter),
    start: jest.fn(),
    stop: jest.fn(),
  };
  const filter = { type: '', frequency: createParam(), connect: jest.fn(() => amp) };
  const amp = { gain: createParam(), connect: jest.fn() };
  const context = {
    currentTime: 0,
    state: 'running',
    destination: {},
    createOscillator: jest.fn(() => oscillator),
    createBiquadFilter: jest.fn(() => filter),
    createGain: jest.fn(() => amp),
    resume: jest.fn(),
    close: jest.fn(),
  };
  const ctor = jest.fn(() => context);
  Object.defineProperty(window, 'AudioContext', {
    value: ctor,
    configurable: true,
    writable: true,
  });
  return { context, oscillator, filter, amp, ctor };
}

function removeAudioStub() {
  Object.defineProperty(window, 'AudioContext', {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

describe('note maths', () => {
  it('maps board positions to MIDI notes in standard tuning', () => {
    expect(noteMidi(0, 0)).toBe(64); // open high e
    expect(noteMidi(5, 0)).toBe(40); // open low E
    expect(noteMidi(0, 5)).toBe(69); // high e, fret 5 → A4
  });

  it('converts MIDI to equal-tempered frequency', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440);
    expect(midiToFrequency(81)).toBeCloseTo(880);
    expect(midiToFrequency(57)).toBeCloseTo(220);
  });
});

describe('without WebAudio', () => {
  beforeEach(removeAudioStub);
  afterEach(closeAudio);

  it('reports no support and stays silent instead of throwing', () => {
    expect(isAudioSupported()).toBe(false);
    expect(() => playPluck(69, 80)).not.toThrow();
  });
});

describe('with WebAudio', () => {
  let stub: ReturnType<typeof installAudioStub>;

  beforeEach(() => {
    closeAudio();
    stub = installAudioStub();
  });
  afterEach(() => {
    closeAudio();
    removeAudioStub();
  });

  it('reports support', () => {
    expect(isAudioSupported()).toBe(true);
  });

  it('builds a plucked voice at the requested pitch', () => {
    playPluck(69, 100);

    expect(stub.oscillator.type).toBe('sawtooth');
    expect(stub.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0);
    expect(stub.filter.type).toBe('lowpass');
    expect(stub.oscillator.start).toHaveBeenCalled();
    expect(stub.oscillator.stop).toHaveBeenCalled();
    // Amp envelope: silent → peak → silent.
    const [[peak]] = stub.amp.gain.exponentialRampToValueAtTime.mock.calls;
    expect(peak).toBeCloseTo(0.35);
  });

  it('scales the peak with the volume slider and skips silent playback', () => {
    playPluck(69, 50);
    const [[peak]] = stub.amp.gain.exponentialRampToValueAtTime.mock.calls;
    expect(peak).toBeCloseTo(0.175);

    stub.context.createOscillator.mockClear();
    playPluck(69, 0);
    expect(stub.context.createOscillator).not.toHaveBeenCalled();
  });

  it('reuses one AudioContext across notes and closes it on demand', () => {
    playPluck(64, 70);
    playPluck(67, 70);
    expect(stub.ctor).toHaveBeenCalledTimes(1);

    closeAudio();
    expect(stub.context.close).toHaveBeenCalled();
  });
});
