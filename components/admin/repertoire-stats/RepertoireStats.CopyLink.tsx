'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Copies the current page's address, which holds the whole state of the view. */
export function RepertoireStatsCopyLink() {
  const t = useTranslations('RepertoireStats.compare');
  const [isCopied, setIsCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--rule)] bg-[var(--card)] px-3 py-1.5 text-[13px] text-[var(--ink-2)] hover:border-[var(--ink-5)]"
    >
      {isCopied ? (
        <Check aria-hidden className="size-3.5" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
      {t(isCopied ? 'copied' : 'copyLink')}
    </button>
  );
}
