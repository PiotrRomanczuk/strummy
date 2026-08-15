/**
 * Lesson Recap Email Template
 *
 * Sent after a lesson is completed with summary, notes, and songs practiced.
 */

import {
  generateBaseEmailHtml,
  createKicker,
  createSectionHeading,
  createGreeting,
  createParagraph,
  createCardSection,
  createDetailRow,
  createSubsectionHeading,
  createStatusBadge,
} from './base-template';
import { DEFAULT_LOCALE, type AppLocale } from '@/i18n/locales';
import { lessonRecap } from './i18n';

export interface LessonEmailData {
  studentName: string;
  lessonDate: string;
  lessonTitle?: string | null;
  notes?: string | null;
  songs?: {
    id?: string;
    title: string;
    artist: string;
    status: string;
    notes?: string | null;
  }[];
  locale?: AppLocale;
}

function getStatusColor(status: string): 'success' | 'warning' | 'info' | 'default' {
  const lower = status.toLowerCase();
  if (lower === 'mastered' || lower === 'completed') return 'success';
  if (lower === 'in progress' || lower === 'learning') return 'warning';
  if (lower === 'new' || lower === 'assigned') return 'info';
  return 'default';
}

function renderSongsTable(
  songs: NonNullable<LessonEmailData['songs']>,
  baseUrl: string,
  songsPracticedLabel: string
): string {
  const rows = songs
    .map(
      (song, index) => `
      <tr style="${index !== songs.length - 1 ? 'border-bottom: 1px solid #eceae4;' : ''}">
        <td style="padding: 14px 16px; font-family: Georgia, 'Times New Roman', Times, serif;">
          <div style="color: #201f1d; font-weight: 600; font-size: 15px;">
            ${
              song.id
                ? `<a href="${baseUrl}/dashboard/songs/${song.id}" style="color: #8a5f24; text-decoration: none;">${song.title}</a>`
                : song.title
            }
          </div>
          <div style="color: #85806f; font-size: 14px; margin-top: 2px;">${song.artist}</div>
          ${song.notes ? `<div style="color: #4f4b45; font-size: 13px; margin-top: 6px; font-style: italic;">${song.notes}</div>` : ''}
        </td>
        <td style="text-align: right; vertical-align: top; padding: 14px 16px; white-space: nowrap;">
          ${createStatusBadge(song.status, getStatusColor(song.status))}
        </td>
      </tr>`
    )
    .join('');

  return `
    <div style="margin-bottom: 24px;">
      ${createSubsectionHeading(songsPracticedLabel)}
      <div style="border: 1px solid #e2dfda; border-radius: 4px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; background-color: #fdfcfa;" role="presentation">
          ${rows}
        </table>
      </div>
    </div>
  `;
}

export function generateLessonRecapHtml(data: LessonEmailData): string {
  const { studentName, lessonDate, lessonTitle, notes, songs, locale = DEFAULT_LOCALE } = data;
  const t = lessonRecap[locale];

  let baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE ||
    'http://localhost:3000';
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

  const bodyContent = `
    ${createKicker(t.kicker)}
    ${createSectionHeading(t.heading)}
    ${createGreeting(studentName, locale)}
    ${createParagraph(t.intro(lessonDate))}

    ${lessonTitle ? createCardSection(createDetailRow(t.topic, lessonTitle)) : ''}

    ${
      notes
        ? `
      ${createSubsectionHeading(t.teacherNotes)}
      <div style="color: #4f4b45; line-height: 1.65; white-space: pre-wrap; background-color: #fdfcfa; border: 1px solid #e2dfda; padding: 16px 20px; border-radius: 4px; font-size: 15px; font-family: Georgia, 'Times New Roman', Times, serif; margin-bottom: 24px;">${notes}</div>
    `
        : ''
    }

    ${songs && songs.length > 0 ? renderSongsTable(songs, baseUrl, t.songsPracticed) : ''}
  `;

  return generateBaseEmailHtml({
    subject: `Lesson Summary - ${lessonDate}`,
    preheader: `Your lesson recap for ${lessonDate}${lessonTitle ? ` — ${lessonTitle}` : ''}`,
    bodyContent,
    locale,
    footerNote: t.footerNote,
    ctaButton: {
      text: t.cta,
      url: `${baseUrl}/dashboard`,
    },
  });
}
