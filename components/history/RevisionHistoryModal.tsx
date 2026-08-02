'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export type RevisionHistoryEntry = {
  id: string;
  changeType: string;
  label: string;
  changedAt: string;
  changedBy?: string | null;
  changedByName?: string | null;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  notes?: string | null;
};

export function RevisionHistoryModal({
  history,
  triggerButton,
}: {
  history: RevisionHistoryEntry[];
  triggerButton: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revision History</DialogTitle>
        </DialogHeader>
        <div
          data-testid="revision-history-list"
          style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}
        >
          {history.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--ink-4)', fontStyle: 'italic' }}>
              No history available.
            </div>
          )}
          {history.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                paddingBottom: 12,
                borderBottom: '1px solid var(--rule)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                    {entry.label}
                  </span>
                  {entry.changedByName ? (
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      by {entry.changedByName}
                    </span>
                  ) : entry.changedBy ? (
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                      by {entry.changedBy}
                    </span>
                  ) : null}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--mono)',
                    color: 'var(--ink-4)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {new Date(entry.changedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {(entry.previousData || entry.newData) && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.03)',
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'var(--mono)',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {entry.previousData && (
                    <div style={{ color: 'var(--danger)', marginBottom: 4 }}>
                      - {JSON.stringify(entry.previousData)}
                    </div>
                  )}
                  {entry.newData && (
                    <div style={{ color: 'var(--success)' }}>+ {JSON.stringify(entry.newData)}</div>
                  )}
                </div>
              )}

              {entry.notes && (
                <div style={{ fontSize: 12, color: 'var(--ink-2)', fontStyle: 'italic' }}>
                  {entry.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
