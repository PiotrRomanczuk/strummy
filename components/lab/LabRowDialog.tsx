'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type Props = {
  title: string;
  value: unknown;
};

/** The whole row (every field, nested JSON included) behind its row number. */
export function LabRowDialog({ title, value }: Props) {
  return (
    <Dialog>
      <DialogTrigger className="font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        {title}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <pre className="max-h-[70vh] overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed text-foreground dark:bg-muted/50">
          {JSON.stringify(value, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
