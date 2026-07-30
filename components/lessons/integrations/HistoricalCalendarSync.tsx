'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useCalendarBulkSync } from '../hooks/useCalendarBulkSync';

export function HistoricalCalendarSync() {
  const t = useTranslations('Calendar');
  const [startDate, setStartDate] = useState('2024-01-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const { isRunning, progress, results, error, startSync, cancelSync } = useCalendarBulkSync();

  const handleStart = () => {
    startSync(startDate, endDate);
  };

  const progressPercent =
    progress && progress.totalMonths > 0
      ? Math.round((progress.monthIndex / progress.totalMonths) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('historicalTitle')}
        </CardTitle>
        <CardDescription>{t('historicalDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="grid gap-2 w-full sm:w-auto">
            <label className="text-sm font-medium">{t('startDateLabel')}</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isRunning}
            />
          </div>
          <div className="grid gap-2 w-full sm:w-auto">
            <label className="text-sm font-medium">{t('endDateLabel')}</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isRunning}
            />
          </div>
          <div className="flex gap-2">
            {!isRunning ? (
              <Button onClick={handleStart} disabled={!startDate || !endDate}>
                {t('importButton')}
              </Button>
            ) : (
              <Button variant="destructive" onClick={cancelSync}>
                {t('cancelButton')}
              </Button>
            )}
          </div>
        </div>

        {isRunning && progress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('processingMonth', { month: progress.currentMonth })}
              </span>
              <span className="text-muted-foreground">
                {t('monthOf', { index: progress.monthIndex, total: progress.totalMonths })}
              </span>
            </div>
            <Progress value={progressPercent} />
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {t('importedCount', { count: progress.imported })}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                {t('skippedCount', { count: progress.skipped })}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                {t('errorsCount', { count: progress.errors })}
              </span>
            </div>
          </div>
        )}

        {results && !isRunning && (
          <div className="rounded-lg border p-4 space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {t('importCompleteTitle')}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{results.imported}</div>
                <div className="text-xs text-muted-foreground">{t('importedLabel')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{results.skipped}</div>
                <div className="text-xs text-muted-foreground">{t('skippedLabel')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{results.errors}</div>
                <div className="text-xs text-muted-foreground">{t('errorsLabel')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{results.total}</div>
                <div className="text-xs text-muted-foreground">{t('totalEventsLabel')}</div>
              </div>
            </div>
            {results.imported > 0 && (
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
                {t('lessonsAddedBadge', { count: results.imported })}
              </Badge>
            )}
          </div>
        )}

        {error && !isRunning && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
            <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              {error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
