import { renderHook } from '@testing-library/react';

import { PolishWrapper } from '@/lib/testing/intl-test-utils';
import plMessages from '@/messages/pl.json';
import { useAIChat } from './useAIChat';

jest.mock('@/hooks/useAIConversation', () => ({
  useAIConversation: () => ({
    conversationId: null,
    conversations: [],
    isLoadingList: false,
    isLoadingConversation: false,
    startNewConversation: jest.fn(),
    clearCurrentConversation: jest.fn(),
    loadConversation: jest.fn().mockResolvedValue([]),
    removeConversation: jest.fn(),
    refreshConversationList: jest.fn(),
  }),
}));
jest.mock('@/hooks/useAIStream', () => ({
  useAIStream: () => ({ isStreaming: false, status: 'idle', start: jest.fn(), reset: jest.fn() }),
}));
jest.mock('@/app/actions/ai', () => ({ generateAIResponseStream: jest.fn() }));

describe('useAIChat (pl)', () => {
  it('greets in Polish', () => {
    const { result } = renderHook(() => useAIChat(), { wrapper: PolishWrapper });
    expect(result.current.messages[0].content).toBe(plMessages.AI.chatWelcome);
    expect(result.current.messages[0].content).toMatch(/^Cześć!/);
  });
});
