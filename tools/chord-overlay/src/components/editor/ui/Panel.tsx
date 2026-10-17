import type { ReactNode } from "react";

export function Panel({ title, subtitle, children }: {
  title: string; subtitle?: string; children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-700">{title}</h2>
        {subtitle && <span className="text-[11px] text-stone-500">{subtitle}</span>}
      </header>
      {children}
    </div>
  );
}
