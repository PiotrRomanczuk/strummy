'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';

export function AuthHashErrorBanner() {
  const t = useTranslations('Auth');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('error=')) return;

    const params = new URLSearchParams(hash.slice(1));
    const code = params.get('error_code') ?? params.get('error') ?? '';
    const description = params.get('error_description')?.replace(/\+/g, ' ') ?? '';

    // Our own sentence, not GoTrue's English `error_description`: the reader
    // is usually a just-invited student, and the raw text reads as a crash.
    let msg: string | null = null;
    if (code === 'otp_expired' || description.toLowerCase().includes('expired')) {
      msg = t('hashExpired');
    } else if (code === 'access_denied') {
      msg = t('hashDenied');
    } else if (code) {
      msg = t('hashProblem');
    }

    window.history.replaceState(null, '', window.location.pathname);
    if (msg) Promise.resolve().then(() => setMessage(msg));
  }, [t]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive shadow-md">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{message}</p>
      </div>
    </div>
  );
}
