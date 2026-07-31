'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const SUGGESTED_PROMPT_KEYS = [
  'suggestedPromptCreatePracticePlan',
  'suggestedPromptExplainMusicTheory',
  'suggestedPromptSongRecommendations',
  'suggestedPromptChordProgressions',
  'suggestedPromptPracticeRoutine',
] as const;

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  isDisabled?: boolean;
  className?: string;
}

export function SuggestedPrompts({ onSelect, isDisabled, className }: SuggestedPromptsProps) {
  const t = useTranslations('AI');

  return (
    <section
      // Wraps rather than scrolls: the row did scroll, but with the scrollbar
      // hidden the last chip just looked clipped with no affordance. There are
      // only a handful of prompts, so wrapping shows them all.
      className={cn('flex flex-wrap gap-2.5 pb-1', className)}
    >
      {SUGGESTED_PROMPT_KEYS.map((key, index) => {
        const prompt = t(key);
        return (
          <button
            key={key}
            data-testid={`ai-suggested-prompt-${index}`}
            onClick={() => onSelect(prompt)}
            disabled={isDisabled}
            className={cn(
              'whitespace-nowrap h-9 px-5',
              'bg-card border border-border/30 rounded-full',
              'text-primary text-xs font-bold tracking-widest uppercase',
              'flex items-center justify-center',
              'hover:bg-muted transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shrink-0'
            )}
          >
            {prompt}
          </button>
        );
      })}
    </section>
  );
}
