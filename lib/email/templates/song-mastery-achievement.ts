/**
 * Song Mastery Achievement Email Template
 *
 * Sent when a student masters a song to celebrate their achievement.
 * No CTA button — this one is a keepsake, not a task.
 */

import {
  generateBaseEmailHtml,
  createGreeting,
  createParagraph,
  createCertificateCard,
  createDivider,
} from './base-template';
import type { SongMasteryAchievementData } from '@/types/notifications';

export function generateSongMasteryAchievementHtml(data: SongMasteryAchievementData): string {
  const { studentName, songTitle, songArtist, masteredDate, totalSongsMastered } = data;
  const songWord = totalSongsMastered === 1 ? 'song' : 'songs';

  const bodyContent = `
    ${createGreeting(studentName)}

    ${createCertificateCard({
      kicker: 'Song Mastered',
      title: songTitle,
      subtitle: `by ${songArtist}`,
      dateLabel: `Mastered on ${masteredDate}`,
      badgeText: `No. ${totalSongsMastered} in your repertoire`,
    })}

    ${createParagraph(
      `This is a real achievement &mdash; &ldquo;${songTitle}&rdquo; asks for steady technique and patience, and you brought both. Your repertoire now stands at <strong>${totalSongsMastered} ${songWord}</strong>.`
    )}

    ${createDivider()}

    <p class="text-secondary" style="margin: 0; font-family: Georgia, 'Times New Roman', Times, serif; font-size: 15px; font-style: italic; color: #4f4b45; text-align: center; line-height: 1.65;">
      &ldquo;The expert in anything was once a beginner.&rdquo;
    </p>
  `;

  return generateBaseEmailHtml({
    subject: `Congratulations! You Mastered "${songTitle}"`,
    preheader: `You've just mastered ${songTitle} by ${songArtist}!`,
    bodyContent,
    tone: 'celebration',
    footerNote: 'Keep playing.',
  });
}
