'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Copy, Check, AlertTriangle, Bot, Cpu, Braces } from 'lucide-react';
import type { AIGeneration } from '@/types/ai-generation';
import {
  getGenerationTypeColor,
  formatRelativeDate,
  normalizeNewlines,
} from './ai-generation.helpers';
import { generationTypeLabel } from './ai-generation.i18n';

interface DetailProps {
  generation: AIGeneration | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStar: (id: string) => void;
}

export function AIGenerationHistoryDetail({
  generation,
  isOpen,
  onClose,
  onToggleStar,
}: DetailProps) {
  const t = useTranslations('AI');
  const [isCopied, setIsCopied] = useState(false);
  const [showParams, setShowParams] = useState(false);

  if (!generation) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generation.output_content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const meta = [
    generation.model_id && {
      label: 'Model',
      value: generation.model_id.split('/').pop(),
      icon: Cpu,
    },
    generation.provider && {
      label: 'Provider',
      value: generation.provider,
      icon: Bot,
    },
    generation.agent_id && {
      label: 'Agent',
      value: generation.agent_id,
      icon: Bot,
    },
  ].filter(Boolean) as { label: string; value: string; icon: typeof Cpu }[];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0">
        <DialogHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Badge className={getGenerationTypeColor(generation.generation_type)}>
              {generationTypeLabel(generation.generation_type, t)}
            </Badge>
            {!generation.is_successful && (
              <Badge variant="destructive">{t('historyDetailFailedBadge')}</Badge>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {formatRelativeDate(generation.created_at, t)}
            </span>
          </div>
          <DialogTitle className="text-lg">
            {generationTypeLabel(generation.generation_type, t)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('historyDetailDialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0 py-2">
          {generation.error_message && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{generation.error_message}</p>
            </div>
          )}

          {generation.output_content ? (
            <div className="rounded-md border bg-muted/50 p-4 max-h-[400px] overflow-y-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5 prose-p:my-1 prose-p:text-[13px] prose-p:leading-relaxed prose-li:my-0.5 prose-li:text-[13px] prose-table:text-xs prose-strong:font-medium prose-h2:text-base">
                <ReactMarkdown>{normalizeNewlines(generation.output_content)}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/50 p-4 text-center">
              <span className="text-sm italic text-muted-foreground">
                {t('historyDetailNoOutputContent')}
              </span>
            </div>
          )}

          {meta.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {meta.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Icon className="size-3.5" />
                  <span className="font-mono">{value}</span>
                </div>
              ))}
            </div>
          )}

          {generation.input_params && Object.keys(generation.input_params).length > 0 && (
            <div>
              <button
                onClick={() => setShowParams(!showParams)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Braces className="size-3.5" />
                {showParams ? t('historyDetailHideInputParams') : t('historyDetailShowInputParams')}
              </button>
              {showParams && (
                <pre className="mt-2 rounded-md border bg-muted/50 p-3 text-xs overflow-x-auto">
                  {JSON.stringify(generation.input_params, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleStar(generation.id)}
            className="gap-1.5"
          >
            <Star
              className={`size-4 ${generation.is_starred ? 'fill-yellow-400 text-yellow-400' : ''}`}
            />
            {generation.is_starred ? t('historyDetailUnstarButton') : t('historyDetailStarButton')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            {isCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {isCopied ? t('historyDetailCopiedButton') : t('historyDetailCopyButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
