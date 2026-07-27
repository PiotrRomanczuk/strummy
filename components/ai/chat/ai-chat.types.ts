export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** ai_messages.id (AIA-2 feedback target). Set once persistence completes
   * after streaming — absent for the welcome message and while streaming. */
  id?: string;
  /** Set when the turn failed; renders as an error rather than a real reply
   * and suppresses the feedback controls. */
  isError?: boolean;
}

export interface AIConversationListItem {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}
