'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Music2,
  Guitar,
  ExternalLink,
  Loader2,
  Youtube,
  Play,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SongWithStatus as Song } from '@/components/songs/types';
import { getStatusBadgeClasses } from '@/lib/utils/status-colors';
import { cardEntrance } from '@/lib/animations';
import { useHaptic } from '@/hooks/use-haptic';

const difficultyColors: Record<string, string> = {
  beginner: 'bg-green-500/10 text-green-500 border-green-500/20',
  intermediate: 'bg-primary/10 text-primary border-primary/20',
  advanced: 'bg-destructive/10 text-destructive border-destructive/20',
};

const difficultyLabels: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const statusLabels: Record<string, string> = {
  to_learn: 'To Learn',
  learning: 'Learning',
  practicing: 'Practicing',
  improving: 'Improving',
  mastered: 'Mastered',
  started: 'Started',
  remembered: 'Remembered',
  with_author: 'Play Along',
};

interface StudentSongCardProps {
  song: Song;
  onStatusChange: (songId: string, newStatus: string) => void;
  isUpdating: boolean;
}

export function StudentSongCard({ song, onStatusChange, isUpdating }: StudentSongCardProps) {
  const haptic = useHaptic();
  const hasResources = song.youtube_url || song.ultimate_guitar_link || song.spotify_link_url || song.audio_files;

  return (
    <motion.div
      variants={cardEntrance}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className="group bg-card rounded-xl border border-border overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all duration-300"
    >
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden relative">
            {song.cover_image_url ? (
              <Image
                src={song.cover_image_url}
                alt={song.title}
                fill
                className="object-cover"
              />
            ) : (
              <Music2 className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant="outline"
              className={cn('capitalize', difficultyColors[song.level || 'beginner'])}
            >
              {difficultyLabels[song.level || 'beginner']}
            </Badge>
            {song.status && (
              <Badge
                variant="outline"
                className={cn('capitalize', getStatusBadgeClasses('song', song.status))}
              >
                {statusLabels[song.status] || song.status.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </div>

        {/* Song Info */}
        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors truncate">
          {song.title}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 truncate">{song.author}</p>

        {/* Details */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center text-sm text-muted-foreground">
            <Guitar className="w-4 h-4 mr-2" />
            Key: {song.key}
          </div>
          {song.chords && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Music2 className="w-4 h-4 mr-2" />
              Chords: {song.chords}
            </div>
          )}
        </div>

        {/* Status Update */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-medium text-muted-foreground">
            Learning Progress
          </label>
          <Select
            value={song.status || 'to_learn'}
            onValueChange={(newStatus) => {
              haptic(newStatus === 'mastered' ? 'success' : 'light');
              onStatusChange(song.id, newStatus);
            }}
            disabled={isUpdating}
          >
            <SelectTrigger className="h-11 sm:h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="to_learn">📝 To Learn</SelectItem>
              <SelectItem value="learning">🎵 Learning</SelectItem>
              <SelectItem value="practicing">🎸 Practicing</SelectItem>
              <SelectItem value="improving">📈 Improving</SelectItem>
              <SelectItem value="mastered">🏆 Mastered</SelectItem>
            </SelectContent>
          </Select>
          {isUpdating && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Quick Resources
          </h4>

          {hasResources ? (
            <div className="grid grid-cols-2 gap-2">
              {song.youtube_url && (
                <a
                  href={song.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-9 px-3 text-xs font-medium bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                  YouTube
                </a>
              )}
              {song.ultimate_guitar_link && (
                <a
                  href={song.ultimate_guitar_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-9 px-3 text-xs font-medium bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Tabs
                </a>
              )}
              {song.spotify_link_url && (
                <a
                  href={song.spotify_link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-9 px-3 text-xs font-medium bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Spotify
                </a>
              )}
              {song.audio_files && (
                <a
                  href={Object.values(song.audio_files)[0] ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-9 px-3 text-xs font-medium bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <Music2 className="w-4 h-4" />
                  Audio
                </a>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              No resources available yet
            </div>
          )}

          {/* View Details */}
          <Link
            href={`/dashboard/songs/${song.id}`}
            className="w-full inline-flex items-center justify-center h-9 px-4 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            View Full Details
            <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
