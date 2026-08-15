'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SortDirection } from '@/hooks/useSortableTable';

interface SortableTableHeadProps {
  sortKey: string;
  activeSortKey: string | null;
  direction: SortDirection;
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'right' | 'center';
  children: React.ReactNode;
}

export function SortableTableHead({
  sortKey,
  activeSortKey,
  direction,
  onSort,
  className,
  align = 'left',
  children,
}: SortableTableHeadProps) {
  const isActive = activeSortKey === sortKey;
  const Icon = isActive ? (direction === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown;
  const label = typeof children === 'string' ? children : sortKey;

  return (
    <TableHead
      className={cn(
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground transition-colors',
          align === 'right' && 'flex-row-reverse',
          align === 'center' && 'mx-auto',
          isActive ? 'text-foreground' : 'text-muted-foreground'
        )}
        aria-label={`Sort by ${label}`}
      >
        {children}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </TableHead>
  );
}
