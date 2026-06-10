import type { CSSProperties } from 'react';

type IconProps = {
  d: string;
  size?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  style?: CSSProperties;
};

export const Icon = ({
  d,
  size = 16,
  stroke = 'currentColor',
  fill = 'none',
  strokeWidth = 1.6,
  style,
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill={fill}
    stroke={stroke}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <path d={d} />
  </svg>
);

export const I = {
  home: 'M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  lesson: 'M4 5h13a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3zM4 5a3 3 0 0 0 3 3h13',
  song: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  assign: 'M9 11l3 3 7-7M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  theory: 'M12 3v18M5 7h14M5 17h14',
  students:
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  stats: 'M3 3v18h18M7 14l3-3 4 4 6-6',
  lessonStats: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  calendar:
    'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 4h18M8 3v4M16 3v4',
  fretboard: 'M3 6h18M3 10h18M3 14h18M3 18h18M7 3v18M13 3v18M19 3v18',
  ai: 'M12 3L4 7v7c0 4 3 6 8 7 5-1 8-3 8-7V7z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9zM10 22a2 2 0 0 0 4 0',
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm10 2l-4.35-4.35',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  chevronD: 'M6 9l6 6 6-6',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDn: 'M12 5v14M5 12l7 7 7-7',
  arrowRt: 'M5 12h14M12 5l7 7-7 7',
  clock: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zm0-14v5l3 2',
  check: 'M5 12l5 5L20 7',
  mastered: 'M8 21l4-8 4 8M12 13V3M6 7h12',
  flame: 'M12 3s4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s0 2 2 2c0-3 1-5 1-8z',
  play: 'M6 4l14 8-14 8z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  more: 'M12 6h.01M12 12h.01M12 18h.01',
  filter: 'M3 5h18l-7 9v6l-4-2v-4z',
  mic: 'M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm7-3a7 7 0 0 1-14 0M12 18v3',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  sun: 'M12 4V2M12 22v-2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5v1a.5.5 0 0 0 .5.5H20',
  spark:
    'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8',
} as const;
