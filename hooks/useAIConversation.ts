'use client';

import { useState, useCallback } from 'react';
import {
  createConversation,
  listConversations,
  getConversation,
  deleteConversation,
  updateConversationTitle,
} from '@/app/actions/ai-conversations';
import type {
  AIConversationSummary,
  AIConversationMessage,
} from '@/types/ai-conversation';
import { logger } from '@/lib/logger';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export function useAIConversation() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  const refreshConversationList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const { data } = await listConversations({ isArchived: false });
      setConversations(data);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  /**
   * Returns the new conversation id, or null with the reason.
   *
   * The reason is returned rather than stored in state: callers act on the
   * failure in the same tick, before a state update would have flushed, and
   * previously got only `null` — so a blocked demo account clicked send and
   * saw nothing happen at all.
   */
  const startNewConversation = useCallback(
    async (modelId: string): Promise<{ id: string | null; error?: string }> => {
      const { data, error } = await createConversation({ modelId });
      if (error || !data) {
        logger.error('[useAIConversation] startNew error:', error);
        return { id: null, error: error || 'Could not start a conversation.' };
      }
      setConversationId(data.id);
      return { id: data.id };
    },
    []
  );

  const loadConversation = useCallback(async (id: string): Promise<Message[]> => {
    setIsLoadingConversation(true);
    try {
      const { data, error } = await getConversation(id);
      if (error || !data) {
        logger.error('[useAIConversation] load error:', error);
        return [];
      }
      setConversationId(id);
      return data.messages.map((msg: AIConversationMessage) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  const clearCurrentConversation = useCallback(() => {
    setConversationId(null);
  }, []);

  const removeConversation = useCallback(async (id: string) => {
    const { error } = await deleteConversation(id);
    if (error) {
      logger.error('[useAIConversation] remove error:', error);
      return;
    }
    if (conversationId === id) setConversationId(null);
    await refreshConversationList();
  }, [conversationId, refreshConversationList]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    const { error } = await updateConversationTitle(id, title);
    if (error) {
      logger.error('[useAIConversation] rename error:', error);
      return;
    }
    await refreshConversationList();
  }, [refreshConversationList]);

  return {
    conversationId,
    conversations,
    isLoadingList,
    isLoadingConversation,
    startNewConversation,
    loadConversation,
    refreshConversationList,
    clearCurrentConversation,
    removeConversation,
    renameConversation,
  };
}
