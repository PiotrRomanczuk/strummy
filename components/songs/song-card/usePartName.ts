'use client';

import { useTranslations } from 'next-intl';

import type { CardPart } from '@/lib/music-theory/song-card';

import { partNameKey } from './song-card.helpers';

/** A part's name in the reader's language, numbered when the song has more than one of its kind ("Refren 2"). */
export function usePartName(): (part: CardPart) => string {
  const ts = useTranslations('Songs');
  return (part) => {
    const { key, ordinal } = partNameKey(part);
    return `${key ? ts(key) : part.label}${ordinal ? ` ${ordinal}` : ''}`;
  };
}
