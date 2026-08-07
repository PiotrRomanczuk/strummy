'use client';

import { useTranslations } from 'next-intl';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/ui/sortable-table-head';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import type { AIGeneration } from '@/types/ai-generation';
import { useSortableTable } from '@/hooks/useSortableTable';
import {
  truncateContent,
  getGenerationTypeColor,
  formatRelativeDate,
} from './ai-generation.helpers';
import { generationTypeLabel } from './ai-generation.i18n';

interface TableProps {
  generations: AIGeneration[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSelect: (generation: AIGeneration) => void;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AIGenerationHistoryTable({
  generations,
  isLoading,
  page,
  totalPages,
  onPageChange,
  onSelect,
  onToggleStar,
  onDelete,
}: TableProps) {
  const t = useTranslations('AI');
  const { sortedItems, sortKey, direction, toggleSort } = useSortableTable(generations, {
    getSortValue: (gen, key) => gen[key as keyof AIGeneration] as string,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('historyTableLoading')}
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        {t('historyTableEmpty')}
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead
              sortKey="generation_type"
              activeSortKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              className="w-[140px]"
            >
              {t('historyTableColType')}
            </SortableTableHead>
            <TableHead>{t('historyTableColContent')}</TableHead>
            <SortableTableHead
              sortKey="created_at"
              activeSortKey={sortKey}
              direction={direction}
              onSort={toggleSort}
              className="w-[100px]"
            >
              {t('historyTableColDate')}
            </SortableTableHead>
            <TableHead className="w-[80px] text-right">{t('historyTableColActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((gen) => (
            <TableRow key={gen.id} className="cursor-pointer group" onClick={() => onSelect(gen)}>
              <TableCell className="align-top pt-3">
                <Badge className={getGenerationTypeColor(gen.generation_type)}>
                  {generationTypeLabel(gen.generation_type, t)}
                </Badge>
              </TableCell>
              <TableCell className="py-3">
                {gen.is_successful ? (
                  <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                    {truncateContent(gen.output_content, 160)}
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    <span>{gen.error_message || t('historyTableGenerationFailed')}</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground mt-1 block font-mono">
                  {gen.model_id ? gen.model_id.split('/').pop() : '-'}
                </span>
              </TableCell>
              <TableCell className="align-top pt-3 text-sm text-muted-foreground whitespace-nowrap">
                {formatRelativeDate(gen.created_at, t)}
              </TableCell>
              <TableCell className="align-top pt-2.5 text-right">
                <div
                  className="flex items-center justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={
                      gen.is_starred
                        ? t('historyTableUnstarAriaLabel')
                        : t('historyTableStarAriaLabel')
                    }
                    aria-pressed={gen.is_starred}
                    onClick={() => onToggleStar(gen.id)}
                  >
                    <Star
                      className={`size-3.5 ${gen.is_starred ? 'fill-yellow-400 text-yellow-400' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={t('historyTableDeleteAriaLabel')}
                    onClick={() => onDelete(gen.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-muted-foreground">
            {t('historyTablePageOf', { page: page + 1, totalPages })}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page === 0}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages - 1}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
