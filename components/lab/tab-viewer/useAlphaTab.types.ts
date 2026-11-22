export interface TabTrackOption {
  index: number;
  name: string;
}

export interface TabViewerState {
  /** Score fetched, parsed and rendered once. */
  isRendered: boolean;
  /** Soundfont loaded and the song turned into MIDI: the transport can be used. */
  isPlayerReady: boolean;
  isPlaying: boolean;
  error: string | null;
  speed: number;
  hasMetronome: boolean;
  hasCountIn: boolean;
  isLooping: boolean;
  scale: number;
  tracks: TabTrackOption[];
  selectedTrack: number;
}

export interface TabViewerActions {
  playPause: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  toggleMetronome: () => void;
  toggleCountIn: () => void;
  toggleLoop: () => void;
  selectTrack: (index: number) => void;
  setScale: (scale: number) => void;
}

export const INITIAL_STATE: TabViewerState = {
  isRendered: false,
  isPlayerReady: false,
  isPlaying: false,
  error: null,
  speed: 1,
  hasMetronome: false,
  hasCountIn: false,
  isLooping: false,
  scale: 1,
  tracks: [],
  selectedTrack: 0,
};
