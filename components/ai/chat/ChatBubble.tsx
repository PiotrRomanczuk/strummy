'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitAIFeedback } from '@/app/actions/ai-feedback';
import { logger } from '@/lib/logger';
import type { ChatMessage } from './ai-chat.types';

interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

/** AIA-2: thumbs up/down writing ai_messages.is_helpful. Only rendered once
 * the message has a persisted id (set after streaming completes). */
function FeedbackButtons({ messageId }: { messageId: string }) {
  const t = useTranslations('AI');
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleFeedback = async (isHelpful: boolean) => {
    if (isPending || submitted !== null) return;
    setIsPending(true);
    try {
      const result = await submitAIFeedback(messageId, isHelpful);
      if (result.success) setSubmitted(isHelpful);
    } catch (err) {
      logger.error('[ChatBubble] submitAIFeedback error:', err);
    } finally {
      setIsPending(false);
    }
  };

  if (submitted !== null) {
    return (
      <span className="text-[10px] text-muted-foreground px-1" data-testid="ai-feedback-thanks">
        {t('chatBubbleFeedbackThanks')}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1 px-1" data-testid="ai-feedback-buttons">
      <button
        type="button"
        aria-label={t('chatBubbleFeedbackHelpfulAriaLabel')}
        onClick={() => handleFeedback(true)}
        disabled={isPending}
        className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        aria-label={t('chatBubbleFeedbackNotHelpfulAriaLabel')}
        onClick={() => handleFeedback(false)}
        disabled={isPending}
        className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

export function ChatBubble({ message, isStreaming = false }: ChatBubbleProps) {
  const t = useTranslations('AI');
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';
  const isEmpty = !message.content.trim();
  const isError = Boolean(message.isError);

  return (
    <div className={cn('flex flex-col gap-1', isUser ? 'items-end ml-12' : 'items-start mr-6')}>
      <div
        className={cn(
          'p-4 shadow-sm max-w-full',
          isUser && 'bg-muted/80 text-foreground rounded-2xl rounded-tr-none',
          isAssistant && 'bg-card text-foreground rounded-2xl rounded-tl-none shadow-lg',
          isSystem && 'bg-primary/5 text-foreground border border-primary/20 rounded-2xl',
          isError && 'border border-destructive/30 bg-destructive/5'
        )}
        data-testid={isError ? 'ai-message-error' : undefined}
      >
        {isAssistant && (
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {t('chatBubbleAssistantLabel')}
            </span>
          </div>
        )}

        {isEmpty && isStreaming ? (
          <TypingIndicator />
        ) : (
          <p
            className={cn(
              'text-sm leading-relaxed whitespace-pre-wrap',
              isError && 'text-destructive'
            )}
          >
            {message.content}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* The welcome bubble is the only message present during SSR, and its
            timestamp is `new Date()` from the useState initializer — which runs
            once on the server and again on the client, in a different time
            zone. That mismatch threw React #418 on every visit to the chat.
            A static greeting has no meaningful clock time, so it shows none;
            real messages are only ever created client-side. */}
        {!isSystem && (
          <span className="text-[10px] text-muted-foreground px-1">
            {message.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
        {isAssistant && !isStreaming && !isError && message.id && (
          <FeedbackButtons messageId={message.id} />
        )}
      </div>
    </div>
  );
}
