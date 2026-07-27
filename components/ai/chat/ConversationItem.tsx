'use client';

import { MessageSquare, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIConversationSummary } from '@/types/ai-conversation';

interface ConversationItemProps {
  conversation: AIConversationSummary;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const title = conversation.title || 'Untitled conversation';
  const dateLabel = new Date(conversation.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // The select and delete controls are SIBLINGS, not nested. Delete used to live
  // inside the row <button>, which is invalid HTML — React logged a hydration
  // error on every chat load and the inner control wasn't reliably reachable.
  return (
    <div
      className={cn(
        'w-full px-3 py-2.5 rounded-lg group',
        'flex items-start gap-2.5 transition-colors',
        isActive ? 'bg-primary/10 text-foreground' : 'hover:bg-muted text-muted-foreground'
      )}
    >
      <button
        onClick={onSelect}
        className="flex flex-1 min-w-0 items-start gap-2.5 text-left"
        aria-current={isActive ? 'true' : undefined}
      >
        <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-medium truncate">{title}</span>
          <span className="block text-[10px] text-muted-foreground mt-0.5">{dateLabel}</span>
        </span>
      </button>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 hover:text-destructive shrink-0"
        aria-label={`Delete conversation: ${title}`}
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}
