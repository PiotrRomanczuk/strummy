ALTER TABLE song_videos
  ADD COLUMN is_recording_correct  boolean NOT NULL DEFAULT false,
  ADD COLUMN is_well_lit           boolean NOT NULL DEFAULT false,
  ADD COLUMN mic_type              text CHECK (mic_type IN ('iphone', 'external')),
  ADD COLUMN is_audio_mixed        boolean NOT NULL DEFAULT false,
  ADD COLUMN is_video_edited       boolean NOT NULL DEFAULT false;
