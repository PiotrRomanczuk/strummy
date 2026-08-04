/**
 * Morning Briefing Email Template
 *
 * Daily digest: student activity, lesson schedule, song library health.
 * Design: Fraunces serif, Courier New labels, newspaper-aesthetic.
 */

import { DailyBriefingStats } from '@/lib/services/song-analytics';
import { generateBaseEmailHtml } from './base-template';

const FRAUNCES = "'Fraunces', Georgia, 'Times New Roman', serif";
const MONO = "'Courier New', Courier, monospace";

function renderProgressRow(
  label: string,
  percentage: number,
  count: number,
  total: number
): string {
  const barColor = percentage >= 70 ? '#059669' : percentage >= 40 ? '#d97706' : '#dc2626';
  return `
    <div style="margin-bottom: 14px;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 5px;">
        <tr>
          <td style="font-family: ${MONO}; font-size: 12px; color: #4f4b45; letter-spacing: 0.03em;">${label}</td>
          <td style="text-align: right; font-family: ${MONO}; font-size: 12px; color: #85806f;">${count}/${total} &mdash; ${percentage}%</td>
        </tr>
      </table>
      <div style="width: 100%; background-color: #eceae4; height: 3px;">
        <div style="width: ${percentage}%; background-color: ${barColor}; height: 3px; max-width: 100%;"></div>
      </div>
    </div>
  `;
}

function renderActionList(
  title: string,
  items: { id: string; title: string; author: string | null }[],
  baseUrl: string
): string {
  if (items.length === 0) return '';
  const shown = items.slice(0, 8);
  const more = items.length - 8;
  return `
    <p style="font-family: ${MONO}; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #85806f; margin: 14px 0 6px 0;">${title} (${items.length})</p>
    <ul style="margin: 0 0 12px 0; padding-left: 16px; font-size: 13px; color: #4f4b45; line-height: 1.8;">
      ${shown.map((s) => `<li><a href="${baseUrl}/dashboard/songs/${s.id}" style="color: #8a5f24; text-decoration: none;">${s.title}</a>${s.author ? ` &mdash; <span style="color: #85806f;">${s.author}</span>` : ''}</li>`).join('')}
      ${more > 0 ? `<li style="color: #9a927f; font-style: italic;">&hellip;and ${more} more</li>` : ''}
    </ul>
  `;
}

export function generateAdminSongReportHtml(stats: DailyBriefingStats): string {
  const { songs, students, lessons } = stats;
  const { totalSongs, coverage, counts, missing } = songs;

  const now = new Date();
  const weekday = now.toLocaleDateString('en-GB', { weekday: 'long' });
  const dayMonth = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  const year = now.getFullYear();
  const overallCoverage = Math.round(
    (coverage.chords + coverage.youtube + coverage.ultimateGuitar + coverage.galleryImages) / 4
  );

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE ||
    'http://localhost:3000';

  const hasMissing =
    missing.chords.length > 0 || missing.youtube.length > 0 || missing.ultimateGuitar.length > 0;

  const bodyContent = `
    <div style="border-bottom: 2px solid #201f1d; padding-bottom: 20px; margin-bottom: 28px;">
      <p style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #85806f; margin: 0 0 12px 0;">Morning Briefing</p>
      <div style="font-family: ${FRAUNCES}; font-size: 38px; font-weight: 300; font-style: italic; color: #201f1d; line-height: 1.1; margin: 0 0 12px 0;">${weekday},<br>${dayMonth}</div>
      <p style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.08em; color: #9a927f; margin: 0;">Strummy &mdash; ${year}</p>
    </div>

    <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 28px;">
      <tr>
        <td style="width: 33%; padding-right: 12px; vertical-align: top; border-right: 1px solid #e2dfda;">
          <p style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #85806f; margin: 0 0 6px 0;">Students</p>
          <p style="font-family: ${FRAUNCES}; font-size: 34px; font-weight: 700; color: #201f1d; margin: 0 0 4px 0; line-height: 1;">${students.total}</p>
          <p style="font-size: 12px; color: ${students.newThisWeek > 0 ? '#059669' : '#9a927f'}; margin: 0;">${students.newThisWeek > 0 ? `+${students.newThisWeek} this week` : 'active'}</p>
        </td>
        <td style="width: 33%; padding: 0 12px; vertical-align: top; border-right: 1px solid #e2dfda;">
          <p style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #85806f; margin: 0 0 6px 0;">Today</p>
          <p style="font-family: ${FRAUNCES}; font-size: 34px; font-weight: 700; color: ${lessons.today > 0 ? '#201f1d' : '#9a927f'}; margin: 0 0 4px 0; line-height: 1;">${lessons.today}</p>
          <p style="font-size: 12px; color: #85806f; margin: 0;">lesson${lessons.today !== 1 ? 's' : ''} &middot; ${lessons.upcoming} upcoming</p>
        </td>
        <td style="width: 33%; padding-left: 12px; vertical-align: top;">
          <p style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #85806f; margin: 0 0 6px 0;">Library</p>
          <p style="font-family: ${FRAUNCES}; font-size: 34px; font-weight: 700; color: #b68235; margin: 0 0 4px 0; line-height: 1;">${totalSongs}</p>
          <p style="font-size: 12px; color: #85806f; margin: 0;">songs &middot; ${overallCoverage}% complete</p>
        </td>
      </tr>
    </table>

    <p style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a5f24; margin: 0 0 16px 0;">&sect; 1 &nbsp;&mdash; Song Library</p>
    ${renderProgressRow('Chords / Lyrics', coverage.chords, counts.withChords, totalSongs)}
    ${renderProgressRow('YouTube Links', coverage.youtube, counts.withYoutube, totalSongs)}
    ${renderProgressRow('Ultimate Guitar', coverage.ultimateGuitar, counts.withUltimateGuitar, totalSongs)}
    ${renderProgressRow('Gallery Images', coverage.galleryImages, counts.withGalleryImages, totalSongs)}

    ${
      hasMissing
        ? `
    <hr style="border: none; border-top: 1px solid #e2dfda; margin: 24px 0 20px 0;">
    <p style="font-family: ${MONO}; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #8a5f24; margin: 0 0 4px 0;">&sect; 2 &nbsp;&mdash; Action Items</p>
    ${renderActionList('Missing chords', missing.chords, baseUrl)}
    ${renderActionList('Missing YouTube', missing.youtube, baseUrl)}
    ${renderActionList('Missing Ultimate Guitar', missing.ultimateGuitar, baseUrl)}
    `
        : ''
    }
  `;

  return generateBaseEmailHtml({
    subject: `Morning Briefing — ${weekday}, ${dayMonth}`,
    preheader: `${totalSongs} songs · ${students.total} students · ${lessons.today} lesson${lessons.today !== 1 ? 's' : ''} today`,
    bodyContent,
    ctaButton: {
      text: 'Open Dashboard',
      url: `${baseUrl}/dashboard`,
    },
  });
}
