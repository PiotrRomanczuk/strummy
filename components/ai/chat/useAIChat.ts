'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { generateAIResponseStream } from '@/app/actions/ai';
import { getLatestAssistantMessageId } from '@/app/actions/ai-feedback';
import { DEFAULT_AI_MODEL } from '@/lib/ai-models';
import { useAIConversation } from '@/hooks/useAIConversation';
import { useAIStream } from '@/hooks/useAIStream';
import { logger } from '@/lib/logger';
import type { ChatMessage } from './ai-chat.types';

// The greeting and the apologies are UI copy (messages/*.json, namespace `AI`).
// `chatEmptyReply` deliberately does not guess a cause. It used to assert "the
// configured model is unavailable", which was wrong on 2026-08-16 — the model
// was fine and the OpenRouter account was out of credits (402) — and that
// sentence cost real debugging time chasing model ids. The server names the
// cause when it can (see describeProviderError); when nothing arrives at all,
// say only that.
type Translate = (key: 'chatWelcome') => string;

function createWelcomeMessage(t: Translate): ChatMessage {
  return { role: 'system', content: t('chatWelcome'), timestamp: new Date() };
}

export function useAIChat() {
  const t = useTranslations('AI');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage(t)]);
  const [selectedModel] = useState(DEFAULT_AI_MODEL);

  const conversation = useAIConversation();
  // sendMessage resolves conversation.conversationId's *replacement* value
  // (activeConvId) before the state update from startNewConversation has
  // re-rendered, so the onComplete closure below — captured on the
  // pre-update render — would otherwise read a stale null. A ref sidesteps
  // that: sendMessage writes it synchronously, onComplete always reads the
  // latest value regardless of which render's closure is running.
  const activeConvIdRef = useRef<string | null>(null);

  const streamAction = useCallback(async function* (
    params: { prompt: string; model: string; conversationId?: string },
    signal?: AbortSignal
  ) {
    // generateAIResponseStream takes no AbortSignal — see its doc comment
    // for why forwarding one crashes Next's Server Action stream wrapper.
    // Cancellation is handled here instead: stop yielding once the local
    // signal fires, letting the request finish server side unobserved.
    for await (const chunk of await generateAIResponseStream(
      params.prompt,
      params.model,
      params.conversationId
    )) {
      if (signal?.aborted) return;
      yield chunk;
    }
  }, []);

  const aiStream = useAIStream(streamAction, {
    onChunk: (content) => {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 && msg.role === 'assistant' ? { ...msg, content } : msg
        )
      );
    },
    onComplete: () => {
      // A stream can finish having yielded nothing at all — that's what a
      // server-side provider failure looks like from here. Without this the
      // turn renders as an empty assistant bubble and the user is told nothing.
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 && msg.role === 'assistant' && !msg.content
            ? { ...msg, content: t('chatEmptyReply'), isError: true }
            : msg
        )
      );
      conversation.refreshConversationList();
      // AIA-2: attach the persisted assistant message's id so the feedback
      // buttons have something to write is_helpful to. The streaming
      // generator awaits persistence before it finishes, so this is safe
      // from the moment onComplete fires — no race with the insert.
      const convId = activeConvIdRef.current;
      if (convId) {
        getLatestAssistantMessageId(convId)
          .then((id) => {
            if (!id) return;
            setMessages((prev) =>
              prev.map((msg, i) =>
                i === prev.length - 1 && msg.role === 'assistant' ? { ...msg, id } : msg
              )
            );
          })
          .catch((e) => logger.error('[useAIChat] getLatestAssistantMessageId error:', e));
      }
    },
    onError: (error) => {
      logger.error('[useAIChat] Streaming error:', error);
      // Previously dropped the assistant bubble entirely, which read as "the
      // assistant said nothing" rather than "the request failed".
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === prev.length - 1 && msg.role === 'assistant'
            ? { ...msg, content: t('chatStreamError'), isError: true }
            : msg
        )
      );
    },
  });

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || aiStream.isStreaming) return;

      let activeConvId = conversation.conversationId;
      if (!activeConvId) {
        const started = await conversation.startNewConversation(selectedModel);
        activeConvId = started.id;
        if (!activeConvId) {
          logger.error('[useAIChat] Failed to create conversation');
          // Say so in the transcript. Returning silently left the user staring
          // at an input that appeared to do nothing — which is exactly what a
          // blocked demo account saw.
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: started.error ?? t('chatStartFailed'),
              timestamp: new Date(),
            },
          ]);
          return;
        }
      }
      activeConvIdRef.current = activeConvId;

      const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
      const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      await aiStream.start({
        prompt: text,
        model: selectedModel,
        conversationId: activeConvId,
      });
    },
    [aiStream, conversation, selectedModel, t]
  );

  const clearChat = useCallback(() => {
    conversation.clearCurrentConversation();
    setMessages([createWelcomeMessage(t)]);
    aiStream.reset();
  }, [conversation, aiStream, t]);

  const loadConversation = useCallback(
    async (id: string) => {
      const loaded = await conversation.loadConversation(id);
      if (loaded.length > 0) {
        setMessages(loaded);
      }
      aiStream.reset();
    },
    [conversation, aiStream]
  );

  return {
    messages,
    isStreaming: aiStream.isStreaming,
    streamStatus: aiStream.status,
    conversations: conversation.conversations,
    currentConversationId: conversation.conversationId,
    isLoadingConversations: conversation.isLoadingList || conversation.isLoadingConversation,
    sendMessage,
    clearChat,
    loadConversation,
    startNewConversation: clearChat,
    removeConversation: conversation.removeConversation,
    refreshConversations: conversation.refreshConversationList,
  };
}
