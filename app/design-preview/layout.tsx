import type { ReactNode } from 'react';
import { Geist, Geist_Mono, Fraunces } from 'next/font/google';

import './editorial-tokens.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  weight: ['400', '500'],
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['opsz'],
  display: 'swap',
});

export default function DesignPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`theme-editorial ${geist.variable} ${geistMono.variable} ${fraunces.variable}`}
      style={{ minHeight: '100vh' }}
    >
      {children}
    </div>
  );
}
