'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Plus, Trash2, Loader2 } from 'lucide-react';
import type { AIConversationSummary } from '@/types/ai-conversation';

interface AIConversationHistoryProps {
  conversations: AIConversationSummary[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AIConversationHistory({
  conversations,
  currentConversationId,
  onSelect,
  onNew,
  onDelete,
  onRefresh,
  isLoading,
}: AIConversationHistoryProps) {
  return (
    <Sheet onOpenChange={(open) => open && onRefresh()}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Conversation history">
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96">
        <SheetHeader>
          <SheetTitle>Conversations</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-3">
          <Button variant="outline" size="sm" className="w-full" onClick={onNew}>
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>

          {isLoading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversations yet
            </p>
          )}

          <div className="flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-12rem)]">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-start gap-2 rounded-md p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                  conv.id === currentConversationId ? 'bg-muted' : ''
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conv.title || 'Untitled conversation'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {conv.context_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDate(conv.updated_at)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
