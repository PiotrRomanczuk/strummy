import { Fraunces, Geist, Geist_Mono } from 'next/font/google';

/**
 * The three Claude Design faces, applied once on the dashboard shell so every
 * page — including ones that never declared them — renders the sidebar, top
 * bar and content in the design fonts. Same config as the per-page copies, so
 * next/font serves one set of files.
 */
export const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

export const dashboardFontVariables = `${geist.variable} ${geistMono.variable} ${fraunces.variable}`;
