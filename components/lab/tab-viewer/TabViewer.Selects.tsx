'use client';

import { cn } from '@/lib/utils';

const SELECT = 'h-8 rounded-md border bg-background px-2 text-sm dark:bg-input/30';

type Props<T extends number> = {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: number) => void;
  /** Text of an option; defaults to the value itself. */
  format?: (option: T) => string;
  className?: string;
};

/** A labelled native select over numeric options (speed, zoom, track index). */
export function LabeledSelect<T extends number>({ label, value, options, onChange, format, className }: Props<T>) {
  return (
    <label className="flex items-center gap-1 text-sm">
      {label}
      <select className={cn(SELECT, className)} value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((option) => (
          <option key={option} value={option}>
            {format ? format(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}
