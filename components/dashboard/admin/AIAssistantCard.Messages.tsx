'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface AIAssistantCardMessagesProps {
  messages: Message[];
  isLoading: boolean;
  suggestedPrompts: string[];
  onSuggestedPromptClick: (prompt: string) => void;
}

export function AIAssistantCardMessages({
  messages,
  isLoading,
  suggestedPrompts,
  onSuggestedPromptClick,
}: AIAssistantCardMessagesProps) {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Start a conversation or try a suggested prompt
        </p>
        <div className="grid grid-cols-1 gap-2 w-full max-w-md">
          {suggestedPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onSuggestedPromptClick(prompt)}
              className="justify-start text-left h-auto py-2 px-3"
            >
              <Sparkles className="h-3 w-3 mr-2 shrink-0" />
              <span className="text-xs">{prompt}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`p-3 rounded-lg ${
            message.role === 'user'
              ? 'bg-primary/10 ml-8'
              : message.role === 'system'
              ? 'bg-primary/5 border border-primary/20'
              : 'bg-muted mr-8'
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold">
              {message.role === 'user'
                ? 'You'
                : message.role === 'system'
                ? 'Welcome'
                : 'AI Assistant'}
            </span>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        </div>
      ))}
      {isLoading && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
