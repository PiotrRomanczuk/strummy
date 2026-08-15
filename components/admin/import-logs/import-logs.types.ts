export type AppleShortcutSongImportLog = {
  id: string;
  user_id: string | null;
  spotify_url: string | null;
  spotify_track_id: string | null;
  song_title: string | null;
  song_artist: string | null;
  song_id: string | null;
  status: 'success' | 'duplicate' | 'error';
  error_message: string | null;
  http_status: number | null;
  source: 'shortcut' | 'api' | 'debug-page';
  created_at: string;
};
