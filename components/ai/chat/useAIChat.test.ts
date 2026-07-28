/**
 * Drafted by local Gemma (gemma3:12b), corrected: mock useAIConversation,
 * useAIStream and the server action; assert the real chat state machine.
 */
import { renderHook, act } from '@testing-library/react';
import { useAIChat } from '@/components/ai/chat/useAIChat';

const mockStart = jest.fn();
const mockStartNewConversation = jest.fn();
jest.mock('@/hooks/useAIConversation', () => ({
  useAIConversation: () => ({
    conversationId: null,
    conversations: [],
    isLoadingList: false,
    isLoadingConversation: false,
    startNewConversation: mockStartNewConversation,
    clearCurrentConversation: jest.fn(),
    loadConversation: jest.fn().mockResolvedValue([]),
    removeConversation: jest.fn(),
    refreshConversationList: jest.fn(),
  }),
}));
jest.mock('@/hooks/useAIStream', () => ({
  useAIStream: () => ({ isStreaming: false, status: 'idle', start: mockStart, reset: jest.fn() }),
}));
jest.mock('@/app/actions/ai', () => ({ generateAIResponseStream: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  // startNewConversation now resolves { id, error? } so the failure reason
  // can reach the UI in the same tick.
  mockStartNewConversation.mockResolvedValue({ id: 'conv-1' });
});

describe('useAIChat', () => {
  it('starts with a single welcome message', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('system');
  });

  it('appends user + assistant messages and starts the stream on send', async () => {
    const { result } = renderHook(() => useAIChat());
    await act(async () => {
      await result.current.sendMessage('How do I practice barre chords?');
    });
    expect(mockStartNewConversation).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(3); // welcome + user + assistant
    expect(result.current.messages[1]).toMatchObject({ role: 'user' });
  });

  it('surfaces the reason when a conversation cannot be started', async () => {
    // A blocked demo account used to get a silent return: the send button
    // appeared to do nothing at all. The reason now lands in the transcript.
    mockStartNewConversation.mockResolvedValue({
      id: null,
      error: 'This action is not available on test accounts',
    });

    const { result } = renderHook(() => useAIChat());
    await act(async () => {
      await result.current.sendMessage('Hello from demo');
    });

    // No conversation means nothing to stream into.
    expect(mockStart).not.toHaveBeenCalled();
    const last = result.current.messages[result.current.messages.length - 1];
    expect(last).toMatchObject({
      role: 'assistant',
      content: 'This action is not available on test accounts',
    });
  });

  it('falls back to generic copy when the failure carries no reason', async () => {
    mockStartNewConversation.mockResolvedValue({ id: null });

    const { result } = renderHook(() => useAIChat());
    await act(async () => {
      await result.current.sendMessage('Hello');
    });

    const last = result.current.messages[result.current.messages.length - 1];
    expect(last.content).toMatch(/could not start a conversation/i);
  });

  it('ignores empty messages', async () => {
    const { result } = renderHook(() => useAIChat());
    await act(async () => {
      await result.current.sendMessage('   ');
    });
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('clearChat resets to the welcome message', async () => {
    const { result } = renderHook(() => useAIChat());
    await act(async () => {
      await result.current.sendMessage('hi');
    });
    act(() => result.current.clearChat());
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('system');
  });
});
