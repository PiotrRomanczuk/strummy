import { Pause, Play, Volume2, VolumeX } from 'lucide-react';

import { Group } from './Fretboard.Primitives';
import { sectionLabel } from './fretboard.styles';

interface PlaybackProps {
  playing: boolean;
  onToggle: () => void;
  bpm: number;
  setBpm: (value: number) => void;
  volume: number;
  setVolume: (value: number) => void;
  audioOn: boolean;
  setAudioOn: (value: boolean) => void;
  audioSupported: boolean;
  disabled: boolean;
}

const PlayButton = ({
  playing,
  onToggle,
  disabled,
}: {
  playing: boolean;
  onToggle: () => void;
  disabled: boolean;
}) => (
  <button
    type="button"
    data-testid="fb-play"
    data-playing={playing}
    aria-pressed={playing}
    disabled={disabled}
    onClick={onToggle}
    style={{
      width: '100%',
      padding: '10px 12px',
      background: playing ? 'var(--gold-tint)' : 'var(--ink)',
      color: playing ? 'var(--gold-2)' : 'var(--paper)',
      border: playing ? '1px solid var(--gold-dim)' : '1px solid transparent',
      borderRadius: 8,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      fontSize: 13,
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}
  >
    {playing ? <Pause size={13} /> : <Play size={13} />}
    {playing ? 'Stop' : 'Play notes'}
  </button>
);

/** Walk the current scale or chord up the neck, one note per beat. */
export const FretboardPlayback = ({
  playing,
  onToggle,
  bpm,
  setBpm,
  volume,
  setVolume,
  audioOn,
  setAudioOn,
  audioSupported,
  disabled,
}: PlaybackProps) => (
  <Group
    label="Playback"
    aside={
      <span
        data-testid="fb-audio-state"
        style={{ ...sectionLabel, fontSize: 10, letterSpacing: '.1em' }}
      >
        {!audioSupported ? 'No audio' : audioOn ? 'Audio on' : 'Muted'}
      </span>
    }
  >
    <PlayButton playing={playing} onToggle={onToggle} disabled={disabled} />

    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Slider
        id="bpm"
        label="BPM"
        min={60}
        max={200}
        value={bpm}
        onChange={setBpm}
        readout={`${bpm}`}
      />
      <Slider
        id="volume"
        label="Vol"
        min={0}
        max={100}
        value={volume}
        onChange={setVolume}
        readout={`${volume}`}
      />
      <button
        type="button"
        data-testid="fb-mute"
        hidden={!audioSupported}
        aria-pressed={!audioOn}
        onClick={() => setAudioOn(!audioOn)}
        style={{
          padding: '6px 10px',
          border: '1px solid var(--rule)',
          background: 'var(--card)',
          color: 'var(--ink-3)',
          borderRadius: 6,
          fontSize: 11,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {audioOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
        {audioOn ? 'Mute audio' : 'Unmute'}
      </button>
    </div>
  </Group>
);

const Slider = ({
  id,
  label,
  min,
  max,
  value,
  onChange,
  readout,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  readout: string;
}) => (
  <div>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: 11,
        color: 'var(--ink-4)',
        fontFamily: 'var(--mono)',
      }}
    >
      <label htmlFor={`fb-${id}`}>{label}</label>
      <span style={{ color: 'var(--ink)' }}>{readout}</span>
    </div>
    <input
      id={`fb-${id}`}
      data-testid={`fb-${id}`}
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      style={{ width: '100%', accentColor: 'var(--gold)' }}
    />
  </div>
);
