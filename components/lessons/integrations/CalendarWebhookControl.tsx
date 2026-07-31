'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { enableCalendarWebhook } from '@/app/actions/calendar-webhook';
import { toast } from 'sonner';
import { RadioReceiver, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function CalendarWebhookControl() {
  const t = useTranslations('Calendar');
  const tToast = useTranslations('Toasts');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await enableCalendarWebhook();
      if (result.success) {
        toast.success(tToast('calendarSyncEnabled'));
      } else {
        const msg = result.error || tToast('calendarSyncEnableFailed');
        toast.error(msg);
        if (msg.includes('Google integration not found')) {
          setError(t('webhookNotConnected'));
        }
      }
    } catch {
      toast.error(tToast('calendarSyncError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm mb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold flex items-center gap-2">
            <RadioReceiver className="h-4 w-4" />
            {t('webhookTitle')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('webhookDescription')}</p>
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm mt-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
              <Link href="/dashboard/settings" className="underline hover:text-destructive/80">
                {t('webhookConnectLink')}
              </Link>
            </div>
          )}
        </div>
        <Button onClick={handleEnable} disabled={loading} variant="outline">
          {loading ? t('webhookEnabling') : t('webhookEnable')}
        </Button>
      </div>
    </div>
  );
}
